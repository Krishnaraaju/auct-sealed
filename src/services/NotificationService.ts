export class NotificationService {
  private static hasPermission = false;

  static async requestPermission() {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return;
    }

    const permission = await Notification.requestPermission();
    this.hasPermission = permission === "granted";
  }

  static async showNotification(title: string, options?: NotificationOptions) {
    if (!this.hasPermission) {
      await this.requestPermission();
    }

    if (this.hasPermission) {
      return new Notification(title, options);
    }
  }
}

export const notificationService = new NotificationService();
