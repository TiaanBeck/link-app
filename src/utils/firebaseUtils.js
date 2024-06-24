import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, arrayUnion, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sendPasswordResetEmail } from "firebase/auth";
import {auth, db, storage } from '@/firebase/firebase';
import axios from 'axios';
import imageCompression from 'browser-image-compression';

/**
 * Fetch user data by UID.
 * @param {string} uid - User ID.
 * @returns {Promise<Object|null>} - User data or null if not found.
 */
export const fetchUserData = async (uid) => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return userDoc.data();
    } else {
      console.error('No such document!');
      return null;
    }
  } catch (error) {
    console.error('Error fetching user data:', error.message);
    return null;
  }
};

/**
 * Add or update user data in Firestore.
 * @param {string} uid - User ID.
 * @param {Object} data - User data to add or update.
 */
export const addUserData = async (uid, data) => {
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, data, { merge: true });
    console.log('User data added/updated successfully');
  } catch (error) {
    console.error('Error adding/updating user data:', error.message);
  }
};

/**
 * Check if the user has a username field and if it is not empty.
 * @param {string} uid - User ID.
 * @returns {Promise<boolean>} - True if username field exists and is not empty, false otherwise.
 */
export const hasUsernameField = async (uid) => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.hasOwnProperty('username') && userData.username.trim() !== '';
    } else {
      console.error('No such document!');
      return false;
    }
  } catch (error) {
    console.error('Error checking username field:', error.message);
    return false;
  }
};

/**
 * Check if the username is already taken.
 * @param {string} username - Username to check.
 * @returns {Promise<boolean>} - True if username is taken, false otherwise.
 */
export const isUsernameTaken = async (username) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking username:', error.message);
    return false;
  }
};

/**
 * Update the username of a user in Firestore.
 * @param {string} uid - User ID.
 * @param {string} username - New username.
 * @returns {Promise<void>}
 */
export const updateUsername = async (uid, username) => {
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, { username }, { merge: true });
    console.log('Username updated successfully');
  } catch (error) {
    console.error('Error updating username:', error.message);
    throw new Error('Username update failed');
  }
};


/**
 * Checks for an active subscription on the user.
 * @param {string} uid - User ID.
 */
export const checkSubscriptionStatus = async (uid) => {
  const subscriptionQuery = query(
    collection(db, 'customers', uid, 'subscriptions'),
    where('status', 'in', ['trialing', 'active', 'canceled'])
  );

  const subscriptionSnapshot = await getDocs(subscriptionQuery);

  if (subscriptionSnapshot.empty) {
    return false;
  }

  let hasActiveSubscription = false;

  subscriptionSnapshot.forEach((doc) => {
    const subscription = doc.data();
    if (subscription.status === 'canceled' && subscription.cancel_at_period_end) {
      hasActiveSubscription = true;
    }
    if (['trialing', 'active'].includes(subscription.status)) {
      hasActiveSubscription = true;
    }
  });

  return hasActiveSubscription;
};

/**
 * Fetch user data by username.
 * @param {string} username - The username of the user.
 * @returns {Promise<Object|null>} - User data or null if not found.
 */
export const fetchUserDataByUsername = async (username) => {
  try {
    // Create a query to find the user by username
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where('username', '==', username));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return userDoc.data();
    } else {
      console.error('No such user!');
      return null;
    }
  } catch (error) {
    console.error('Error fetching user data by username:', error.message);
    return null;
  }
};

/**
 * Fetches a user's links from Firestore.
 */
export const addLinkToFirestore = async ({ title, link, userId, urlMetaData }) => {
  if (!title || !link || !userId || !urlMetaData) {
    throw new Error('Missing required fields');
  }

  const userDocRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userDocRef);

  let currentLinks = [];
  let newId = 1;

  if (userDoc.exists()) {
    const userData = userDoc.data();
    currentLinks = userData.links || [];
    newId = currentLinks.length + 1;
  }

  // Ensure urlMetaData and its fields have no undefined values
  const validatedUrlMetaData = { mediaType: urlMetaData.mediaType, metadata: {} };
  for (const key in urlMetaData.metadata) {
    if (urlMetaData.metadata[key] !== undefined) {
      validatedUrlMetaData.metadata[key] = urlMetaData.metadata[key];
    }
  }

  const newLink = { 
    id: newId, 
    title, 
    link,
    active: false,
    metadata: validatedUrlMetaData,
    layout: 'classic',
    linkType: 'external',
  };

  // Log the newLink object to check for any undefined fields
  console.log('New Link:', newLink);

  let updatedLinks = [];
  if (currentLinks.length === 0) {
    // If the links array does not exist, set the document with the new link
    await setDoc(userDocRef, { links: [newLink] }, { merge: true });
    updatedLinks = [newLink];
  } else {
    // If the links array exists, update the document with the new link
    await updateDoc(userDocRef, {
      links: arrayUnion(newLink)
    });
    updatedLinks = [...currentLinks, newLink];
  }

  return updatedLinks;
};





/**
 * Update the users links array in Firestore
 * @param {string} userId 
 * @param {*} links 
 */
export const updateLinks = async (userId, links) => {
  const userDocRef = doc(db, 'users', userId);

  try {
    await updateDoc(userDocRef, {
      links: links
    });
    console.log('Links updated successfully');
  } catch (error) {
    console.error('Error updating links: ', error);
    throw error;
  }
};

export const getAllTemplates = async () => {
  try {
    const templatesCol = collection(db, 'templates');
    const templateSnapshot = await getDocs(templatesCol);
    const templateList = templateSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return templateList;
  } catch (error) {
    console.error("Error fetching templates: ", error);
    throw error;
  }
};


export const updateUserProfilePicture = async (userId, file) => {
  const storage = getStorage();
  const storageRef = ref(storage, `profilePictures/${userId}/${file.name}`);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  const userDocRef = doc(db, 'users', userId);
  await updateDoc(userDocRef, {
    profilePicture: downloadURL
  });

  return downloadURL;
};


export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log("Password reset email sent.");
  } catch (error) {
    console.error("Error sending password reset email:", error);
  }
};


/**
 * Updates the active state of a specific link in Firestore.
 * If the active key does not exist, it adds the key with a default value.
 * @param {string} userId - The ID of the user.
 * @param {number} linkId - The ID of the link.
 * @param {boolean} active - The new active state.
 */
export const updateLinkActiveState = async (userId, linkId, active) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const links = userData.links || [];
      
      const updatedLinks = links.map(link => {
        if (link.id === linkId) {
          return { ...link, active };
        }
        return link;
      });

      await updateDoc(userRef, { links: updatedLinks });

      console.log('Link active state updated successfully');
      return updatedLinks;
    } else {
      throw new Error('User document does not exist');
    }
  } catch (error) {
    console.error('Error updating link active state: ', error);
    throw error;
  }
};

/**
 * Updates a specific link data (e.g., title or url) in Firestore.
 * If the field key does not exist, it adds the key with the provided value.
 * @param {string} userId - The ID of the user.
 * @param {number} linkId - The ID of the link.
 * @param {string} field - The field to update (e.g., 'title' or 'link').
 * @param {any} value - The new value for the field.
 */
export const updateLinkData = async (userId, linkId, field, value) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const links = userData.links || [];

      const updatedLinks = links.map(link => {
        if (link.id === linkId) {
          return { ...link, [field]: value };
        }
        return link;
      });

      await updateDoc(userRef, { links: updatedLinks });

      console.log(`Link ${field} updated successfully`);
      return updatedLinks;
    } else {
      throw new Error('User document does not exist');
    }
  } catch (error) {
    console.error(`Error updating link ${field}: `, error);
    throw error;
  }
};

/**
 * Deletes a specific link from the user's links array in Firestore.
 * @param {string} userId - The ID of the user.
 * @param {number} linkId - The ID of the link to be deleted.
 * @returns {Array} - The updated links array after deletion.
 */
export const deleteLinkById = async (userId, linkId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const links = userData.links || [];
      
      const updatedLinks = links.filter(link => link.id !== linkId);

      await updateDoc(userRef, { links: updatedLinks });

      console.log('Link deleted successfully');
      return updatedLinks;
    } else {
      throw new Error('User document does not exist');
    }
  } catch (error) {
    console.error('Error deleting link: ', error);
    throw error;
  }
};

/**
 * Validates a URL against a specified regex pattern.
 * @param {string} url The URL to validate.
 * @return {boolean} True if the URL is valid, false otherwise.
 */
export const validateUrl = (url) => {
  const urlPattern = new RegExp(
    'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
  );
  return urlPattern.test(url);
};

/**
 * Downloads an image from the given URL using the proxy API route and uploads it to Firebase Storage under the current user.
 * @param {string} userId - The ID of the current user.
 * @param {string} imageUrl - The URL of the image to download.
 * @returns {Promise<string>} - The download URL of the uploaded image.
 */
export const downloadAndUploadImage = async (userId, imageUrl) => {
  try {
    // Fetch the image as a blob using the Next.js API route
    const proxyUrl = `/api/downloadImage?url=${encodeURIComponent(imageUrl)}`;
    const response = await axios.get(proxyUrl, { responseType: 'blob' });
    const imageBlob = response.data;

    // Create a reference to the Firebase Storage location
    const storageRef = ref(storage, `users/${userId}/images/${Date.now()}_${imageUrl.split('/').pop()}`);

    // Upload the image blob to Firebase Storage
    await uploadBytes(storageRef, imageBlob);

    // Get the download URL of the uploaded image
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error) {
    console.error('Error downloading or uploading image: ', error);
    throw error;
  }
};

/**
 * Compresses and uploads the given image file to Firebase Storage under the current user.
 * @param {string} userId - The ID of the current user.
 * @param {File} imageFile - The image file to upload.
 * @returns {Promise<string>} - The download URL of the uploaded image.
 */
export const uploadImage = async (userId, imageFile) => {
  try {
    // Compress the image file
    const options = {
      maxSizeMB: 0.5, // Maximum size in MB
      maxWidthOrHeight: 1920, // Max width or height
      useWebWorker: true, // Use web worker for better performance
    };
    const compressedFile = await imageCompression(imageFile, options);

    // Create a reference to the Firebase Storage location
    const storageRef = ref(storage, `users/${userId}/images/${Date.now()}_${imageFile.name}`);

    // Upload the compressed image file to Firebase Storage
    await uploadBytes(storageRef, compressedFile);

    // Get the download URL of the uploaded image
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading image: ', error);
    throw error;
  }
};
