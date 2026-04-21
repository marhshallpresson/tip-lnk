import { db } from './db.js'

export interface CreateNotificationArgs {
  userId: string
  title: string
  body: string
  type?: string
  data?: any
}

export const createNotification = async (args: CreateNotificationArgs) => {
  try {
    const [id] = await db('notifications').insert({
      user_id: args.userId,
      title: args.title,
      body: args.body,
      type: args.type || 'info',
      data: args.data ? JSON.stringify(args.data) : null,
      created_at: new Date().toISOString()
    }).returning('id')
    return id
  } catch (error) {
    console.error('Failed to create notification:', error)
    return null
  }
}
