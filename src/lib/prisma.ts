import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

// 测试数据库连接
if (process.env.NODE_ENV !== 'production') {
  prisma.$connect()
    .then(() => {
      console.log('[DEBUG] Prisma 数据库连接成功')
      console.log('[DEBUG] DATABASE_URL:', process.env.DATABASE_URL ? '已设置' : '未设置')
    })
    .catch((error) => {
      console.error('[DEBUG] Prisma 数据库连接失败:', error)
      console.error('[DEBUG] DATABASE_URL:', process.env.DATABASE_URL ? '已设置' : '未设置')
    })
  
  globalForPrisma.prisma = prisma
}
