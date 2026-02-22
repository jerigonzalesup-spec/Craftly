
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Inbox, X } from "lucide-react";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Link } from "react-router-dom";
import { useUserNotificationsOptimized } from "@/hooks/use-user-notifications-optimized";
import { useUser } from "@/firebase/auth/use-user";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "./ui/skeleton";

export function NotificationSheet() {
  const { user } = useUser();
  const { notifications, unreadCount, markAllAsRead, deleteNotification, loading } = useUserNotificationsOptimized(user?.uid);

  const handleDelete = (e, notificationId) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNotification(notificationId);
  };

  const parseDate = (createdAt) => {
    if (!createdAt) return new Date();
    // If it's a Firestore Timestamp object with toDate method
    if (typeof createdAt.toDate === 'function') {
      return createdAt.toDate();
    }
    // If it's a serialized Firestore Timestamp with _seconds
    if (createdAt._seconds) {
      return new Date(createdAt._seconds * 1000);
    }
    // If it's an ISO string
    if (typeof createdAt === 'string') {
      return new Date(createdAt);
    }
    // If it's already a Date
    if (createdAt instanceof Date) {
      return createdAt;
    }
    // Fallback
    return new Date();
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Open notifications</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <Separator className="my-4" />
        {loading ? (
            <div className="space-y-4 px-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        ) : notifications.length > 0 ? (
          <>
            <ScrollArea className="flex-1 -mx-6">
                <div className="px-6 flex flex-col gap-1 py-2">
                    {notifications.map((notif) => (
                      <div key={notif.id} className={cn("relative group rounded-lg transition-colors hover:bg-accent", !notif.isRead && "bg-accent/60")}>
                        <Link to={notif.link || '#'} className="block p-3">
                            <div className="flex items-start gap-3">
                                {!notif.isRead && <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
                                <div className={cn("flex-1 pr-6", !notif.isRead && "font-semibold")}>
                                    <p className="text-sm leading-snug">{notif.message}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(parseDate(notif.createdAt), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        </Link>
                         <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDelete(e, notif.id)}
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Delete notification</span>
                        </Button>
                      </div>
                    ))}
                </div>
            </ScrollArea>
            {unreadCount > 0 &&
                <SheetFooter className="mt-4">
                    <Button variant="outline" className="w-full" onClick={markAllAsRead}>
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Mark all as read
                    </Button>
                </SheetFooter>
            }
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <Inbox className="h-24 w-24 text-muted" />
            <h3 className="font-semibold text-xl">All caught up</h3>
            <p className="text-muted-foreground">
              You don't have any new notifications.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
