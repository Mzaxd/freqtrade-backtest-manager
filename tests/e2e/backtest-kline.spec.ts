import { test, expect } from '@playwright/test';

test.describe('Backtest K-Line Chart', () => {
  test('should display the k-line chart correctly', async ({ page }) => {
    // Navigate to the specific backtest page
    await page.goto('http://localhost:5173/zh/backtests/cmell50ea0001uqv811r8efoe');

    // Click on the 'K线图' tab
    await page.getByRole('tab', { name: 'K线图' }).click();

    // Wait for the chart to be visible
    const chartContainer = page.locator('div.tv-lightweight-charts');
    await expect(chartContainer).toBeVisible({ timeout: 15000 });

    // Verify the canvas for the chart is rendered
    const chartCanvas = chartContainer.locator('canvas').first();
    await expect(chartCanvas).toBeVisible();

    // Optional: Check if the pair selector is present
    await expect(page.getByRole('region', { name: 'Trading Chart' }).getByRole('combobox')).toBeVisible();
  });
});