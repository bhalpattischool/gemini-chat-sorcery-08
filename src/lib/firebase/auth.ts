
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  User
} from "firebase/auth";
import { ref, set, get } from "firebase/database";
import { getDownloadURL, uploadBytes, ref as storageRef } from "firebase/storage";
import { auth, database, storage } from "./config";

// Login with email/password
export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
};

// Register a new user
export const registerUser = async (
  email: string, 
  password: string, 
  displayName: string,
  userCategory?: string,
  educationLevel?: string
) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile
    await updateProfile(user, { displayName });
    
    // Create user document in database
    await set(ref(database, `users/${user.uid}`), {
      email,
      displayName,
      createdAt: Date.now(),
      points: 0,
      level: 1,
      ...(userCategory && { category: userCategory }),
      ...(educationLevel && { education: educationLevel })
    });
    
    return user;
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
};

// Upload profile image
export const uploadProfileImage = async (userId: string, file: File) => {
  try {
    const fileRef = storageRef(storage, `profile_images/${userId}`);
    await uploadBytes(fileRef, file);
    
    const downloadURL = await getDownloadURL(fileRef);
    
    // Update user profile
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, {
        photoURL: downloadURL
      });
    }
    
    // Update user document in database
    await set(ref(database, `users/${userId}/photoURL`), downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading profile image:", error);
    throw error;
  }
};

// Sign out
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

// Password reset
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error("Error resetting password:", error);
    throw error;
  }
};

// Get user profile from database
export const getUserProfile = async (userId: string) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}`));
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};
