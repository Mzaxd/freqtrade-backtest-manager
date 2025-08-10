import { spawn } from 'child_process'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export async function processPlot(job: { data: { taskId: string } }) {
  const { taskId } = job.data
  console.log(`[PLOT WORKER] Processing plot for task: ${taskId}`)

  try {
    const task = await prisma.backtestTask.findUnique({
      where: { id: taskId },
      include: {
        config: true,
      },
    })

    if (!task) {
      throw new Error(`Backtest task ${taskId} not found`)
    }

    if (!task.rawOutputPath) {
      throw new Error(`Backtest result file not found for task ${taskId}`)
    }

    const commandWithArgs = (process.env.FREQTRADE_PATH || 'freqtrade').split(' ')
    const command = commandWithArgs[0]
    const baseArgs = commandWithArgs.slice(1)
    
    const userDataPath = process.env.FREQTRADE_USER_DATA_PATH || path.join(process.cwd(), 'ft_user_data');
    const containerUserDataPath = process.env.FREQTRADE_CONTAINER_USER_DATA_PATH || '/freqtrade/user_data';

    let resultFileName = path.basename(task.rawOutputPath)
    if (resultFileName.endsWith('.meta.json')) {
      resultFileName = resultFileName.replace('.meta.json', '.zip');
    }
    const containerResultPath = path.posix.join(containerUserDataPath, 'backtest_results', resultFileName)

    const plotArgs = [
      ...baseArgs,
      'plot-profit',
      '--backtest-filename', containerResultPath,
    ];

    if (task.config?.filename) {
      const containerConfigPath = path.posix.join(containerUserDataPath, 'configs', task.config.filename);
      plotArgs.push('--config', containerConfigPath);
    }

    // 直接使用任务中存储的 timeframe
    if (!task.timeframe) {
      throw new Error(`Task ${taskId} is missing the timeframe property.`);
    }
    plotArgs.push('--timeframe', task.timeframe);
    
    console.log(`[PLOT WORKER] Spawning command: ${command} with args: ${plotArgs.join(' ')} in cwd: ${userDataPath}`);
    const plotChild = spawn(command, plotArgs, { cwd: userDataPath, env: { ...process.env } });

    let plotLogs = '';
    plotChild.stdout.on('data', (data) => {
        const log = data.toString();
        plotLogs += log;
        redis.publish(`logs:${taskId}:plot`, log)
        console.log(`[${taskId}-plot] ${log}`);
    });
    plotChild.stderr.on('data', (data) => {
        const log = data.toString();
        plotLogs += log;
        redis.publish(`logs:${taskId}:plot`, log)
        console.log(`[${taskId}-plot] ${log}`);
    });

    const plotExitCode = await new Promise<number>((resolve) => {
      plotChild.on('close', resolve);
    });

    if (plotExitCode !== 0) {
      throw new Error(`Plot generation failed with exit code ${plotExitCode}.\nLogs:\n${plotLogs}`);
    }

    const defaultPlotPath = path.join(userDataPath, 'plots', 'freqtrade-profit-plot.html');
    const finalPlotFileName = `profit_plot_${path.basename(resultFileName, '.zip')}.html`;
    const finalPlotPath = path.join(userDataPath, 'plots', finalPlotFileName);
    
    // It's possible the plot file is in /freqtrade/user_data/plot/ not plots
    const altPlotPath = path.join(userDataPath, 'plot', 'freqtrade-profit-plot.html');

    let sourcePath: string;

    const defaultPlotExists = await fs.promises.access(defaultPlotPath).then(() => true).catch(() => false);
    const altPlotExists = await fs.promises.access(altPlotPath).then(() => true).catch(() => false);

    if (defaultPlotExists) {
      sourcePath = defaultPlotPath;
    } else if (altPlotExists) {
      sourcePath = altPlotPath;
    } else {
        throw new Error(`Default plot file not found at ${defaultPlotPath} or ${altPlotPath}`);
    }
    
    try {
      await fs.promises.mkdir(path.dirname(finalPlotPath), { recursive: true });
      await fs.promises.rename(sourcePath, finalPlotPath);
    } catch (renameError) {
      throw new Error(`Failed to rename plot file from ${sourcePath} to ${finalPlotPath}. Error: ${renameError}`);
    }

    const plotProfitUrl = `/plots/${finalPlotFileName}`;

    await prisma.backtestTask.update({
      where: { id: taskId },
      data: { plotProfitUrl },
    })

    console.log(`[PLOT WORKER] Successfully generated plot for task: ${taskId}`)

  } catch (error) {
    console.error(`[PLOT WORKER] CRITICAL ERROR generating plot for task ${taskId}:`, error);
    // Optionally, update task status to FAILED_PLOT or similar
  }
}