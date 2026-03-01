'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, Info, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, Notification, NotificationType } from '@/app/actions/notifications'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    const fetchNotifications = async () => {
        setIsLoading(true)
        const { notifications, unreadCount } = await getUserNotifications()
        setNotifications(notifications)
        setUnreadCount(unreadCount)
        setIsLoading(false)
    }

    useEffect(() => {
        fetchNotifications()
    }, [])

    const handleMarkAsRead = async (id: string) => {
        await markNotificationAsRead(id)
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const handleMarkAllAsRead = async () => {
        await markAllNotificationsAsRead()
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
    }

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open)
        if (open) {
            fetchNotifications() // Refresh when opened
        }
    }

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case 'info': return <Info className="h-4 w-4 text-blue-500" />
            case 'alert': return <AlertCircle className="h-4 w-4 text-destructive" />
            case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />
            default: return <Info className="h-4 w-4 text-muted-foreground" />
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return new Intl.DateTimeFormat('es-ES', {
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short'
        }).format(date)
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-white/10 shrink-0">
                    <Bell className="h-5 w-5 md:h-6 md:w-6 transition-transform hover:scale-110" />
                    {unreadCount > 0 && (
                        <span className="absolute 
                            top-0 right-0 md:-top-1 md:-right-1 
                            flex h-4 w-4 md:h-5 md:w-5 
                            items-center justify-center 
                            rounded-full bg-destructive 
                            text-[8px] md:text-[10px] font-bold text-white shadow-sm 
                            animate-in zoom-in">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 md:w-96 max-h-[80vh] overflow-hidden flex flex-col p-0 border-border/50 shadow-xl rounded-xl">
                <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                    <DropdownMenuLabel className="font-semibold text-lg p-0">Notificaciones</DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-medium text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                                e.preventDefault();
                                handleMarkAllAsRead();
                            }}
                        >
                            <Check className="mr-1.5 h-3.5 w-3.5" /> Marcar leídas
                        </Button>
                    )}
                </div>

                <div className="overflow-y-auto overflow-x-hidden flex-1 p-2">
                    {isLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Cargando...</div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mb-3 opacity-20" />
                            <p className="text-sm">No tienes notificaciones</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {notifications.map((notification) => (
                                <DropdownMenuItem
                                    key={notification.id}
                                    className={cn(
                                        "flex flex-col items-start gap-1 p-3 cursor-pointer rounded-lg transition-colors focus:bg-muted/50",
                                        !notification.is_read && "bg-primary/5 hover:bg-primary/10"
                                    )}
                                    onClick={(e) => {
                                        if (!notification.is_read) {
                                            e.preventDefault() // Keep open if just marking as read
                                            handleMarkAsRead(notification.id)
                                        }
                                        if (notification.link_url) {
                                            // Ideally we'd navigate here, but using a Link wrapper is safer for full re-renders if needed.
                                            // The MenuTrigger will handle closing.
                                            window.location.href = notification.link_url;
                                        }
                                    }}
                                >
                                    <div className="flex w-full items-start gap-3">
                                        <div className="shrink-0 mt-0.5">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 space-y-1 overflow-hidden">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={cn(
                                                    "text-sm font-medium leading-none truncate",
                                                    !notification.is_read && "text-foreground font-semibold"
                                                )}>
                                                    {notification.title}
                                                </p>
                                                {!notification.is_read && (
                                                    <span className="shrink-0 flex h-2 w-2 rounded-full bg-primary" />
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/60 font-medium">
                                                {formatDate(notification.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </div>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
