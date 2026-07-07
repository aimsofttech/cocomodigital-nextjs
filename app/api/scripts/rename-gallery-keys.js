'use strict';

/**
 * One-time migration: rename Gallery (galleries + galleries_video) document
 * keys to camelCase, mirroring the other rename-*-keys scripts.
 *
 * Run:   node scripts/rename-gallery-keys.js     (from app/api)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { rename, fillRename, fixTimestamps } = require('./_renameHelpers');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const images = db.collection('galleries');
  await rename(images, {
    image_title: 'title',
    image_description: 'description',
    image_type: 'type',
    display_order: 'displayOrder',
    user_id: 'userId',
  });
  // Legacy migrated rows store the file under image_file; admin rows use image.
  await fillRename(images, 'image_file', 'image');
  await fixTimestamps(images);

  const videos = db.collection('galleries_video');
  await rename(videos, {
    video_title: 'title',
    video_type: 'type',
    video_thumbnail: 'thumbnail',
    video_url: 'url',
    video_youtube_id: 'youtubeId',
    video_file: 'videoFile',
    display_order: 'displayOrder',
    user_id: 'userId',
  });
  await fixTimestamps(videos);

  await mongoose.disconnect();
  console.log('rename-gallery-keys: done');
})().catch((err) => { console.error(err); process.exit(1); });
