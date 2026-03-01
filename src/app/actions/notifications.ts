'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type NotificationType = 'info' | 'alert' | 'success'

export interface Notification {
    id: string
    user_id: string
    title: string
    message: string
    type: NotificationType
    is_read: boolean
    link_url: string | null
    created_at: string
}

export async function getUserNotifications(): Promise<{ notifications: Notification[], unreadCount: number, error: string | null }> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { notifications: [], unreadCount: 0, error: 'Not authenticated' }
        }

        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) {
            console.error('Error fetching notifications:', error)
            return { notifications: [], unreadCount: 0, error: error.message }
        }

        const unreadCount = notifications ? notifications.filter(n => !n.is_read).length : 0

        return { notifications: notifications || [], unreadCount, error: null }
    } catch (err: any) {
        return { notifications: [], unreadCount: 0, error: err.message || 'Unknown error' }
    }
}

export async function markNotificationAsRead(notificationId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) throw new Error('Not authenticated')

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('user_id', user.id)

        if (error) throw error

        revalidatePath('/', 'layout')
        return { success: true, error: null }
    } catch (err: any) {
        console.error('Error marking notification as read:', err)
        return { success: false, error: err.message }
    }
}

export async function markAllNotificationsAsRead() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) throw new Error('Not authenticated')

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false)

        if (error) throw error

        revalidatePath('/', 'layout')
        return { success: true, error: null }
    } catch (err: any) {
        console.error('Error marking all notifications as read:', err)
        return { success: false, error: err.message }
    }
}

// For internal system use
export async function createNotification(userId: string, title: string, message: string, type: NotificationType = 'info', linkUrl?: string) {
    try {
        const supabase = await createClient()
        // Ensure admin or service role is doing this
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') throw new Error('Not authorized')

        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                message,
                type,
                link_url: linkUrl || null
            })

        if (error) throw error
        return { success: true, error: null }
    } catch (err: any) {
        console.error('Error creating notification:', err)
        return { success: false, error: err.message }
    }
}
