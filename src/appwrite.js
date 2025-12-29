import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';

const APPWRITE_ENDPOINT = process.env.REACT_APP_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.REACT_APP_APPWRITE_PROJECT_ID || '690c59ab00305a934c0c';
const APPWRITE_DATABASE_ID = process.env.REACT_APP_APPWRITE_DATABASE_ID || '690c59cb0024184a35a2';
const APPWRITE_USERS_COLLECTION_ID = process.env.REACT_APP_APPWRITE_USERS_COLLECTION_ID || 'users'; // required for user docs
const APPWRITE_CHAT_COLLECTION_ID = process.env.REACT_APP_APPWRITE_CHAT_COLLECTION_ID || 'chat';
const APPWRITE_GAMES_COLLECTION_ID = process.env.REACT_APP_APPWRITE_GAMES_COLLECTION_ID || 'games';
const APPWRITE_GAMEINFO_COLLECTION_ID = process.env.REACT_APP_APPWRITE_GAMEINFO_COLLECTION_ID || 'gameinfo';
const APPWRITE_AVATARS_BUCKET_ID = process.env.REACT_APP_APPWRITE_AVATARS_BUCKET_ID || '69510a3b002f65b6b46d';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const appwriteIds = {
  databaseId: APPWRITE_DATABASE_ID,
  usersCollectionId: APPWRITE_USERS_COLLECTION_ID,
  chatCollectionId: APPWRITE_CHAT_COLLECTION_ID,
  gamesCollectionId: APPWRITE_GAMES_COLLECTION_ID,
  gameinfoCollectionId: APPWRITE_GAMEINFO_COLLECTION_ID,
  avatarsBucketId: APPWRITE_AVATARS_BUCKET_ID,
};
export { ID, Query };


