# Enable Email/Password Authentication in Firebase

## Quick Fix for 400 Error

If you're getting a 400 error when trying to sign up, it means **Email/Password authentication is not enabled** in your Firebase project.

## Steps to Enable Authentication

1. **Go to Firebase Console**
   - Visit [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Select your project: **vitecall-180e1**

2. **Open Authentication**
   - Click on **Authentication** in the left sidebar
   - If you see "Get started", click it

3. **Enable Email/Password**
   - Click on the **Sign-in method** tab
   - Find **Email/Password** in the list
   - Click on it
   - Toggle **Enable** to ON
   - Click **Save**

4. **That's it!**
   - Go back to your app
   - Try signing up again
   - The 400 error should be gone!

## Visual Guide

```
Firebase Console
├── Authentication
    ├── Sign-in method tab
        ├── Email/Password
            ├── Enable: ON ← Turn this on!
            └── Save
```

## Additional Settings (Optional)

You can also configure:
- **Email link (passwordless sign-in)** - Optional
- **Password reset** - Already enabled by default

## Still Getting Errors?

1. **Check the browser console** for the exact error message
2. **Verify your Firebase project** is correct (vitecall-180e1)
3. **Make sure you saved** the Email/Password enable setting
4. **Wait a few seconds** - changes can take a moment to propagate

## Test It

After enabling, try signing up with:
- A valid email address
- A password with at least 6 characters
- A username and name

The app should now work! 🎉

