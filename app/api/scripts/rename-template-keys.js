'use strict';

/**
 * One-time migration: rename Common Templates document keys to camelCase —
 * author_template, book_a_call, our_advantage. The maps are grounded in the
 * REAL data keys (Payload-era flat fields), not just the old model schemas.
 *
 * Run:   node scripts/rename-template-keys.js     (from app/api)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { rename, fillRename, fixTimestamps } = require('./_renameHelpers');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const authors = db.collection('author_template');
  await rename(authors, {
    template_name: 'templateName',
    author_name: 'name',
    author_image: 'image',
    author_designation: 'designation',
    author_bio: 'bio',
    author_description: 'description',
    author_url: 'url',
    click_here_text: 'clickHereText',
    click_here_url: 'clickHereUrl',
    founder_text: 'founderText',
    founder_url: 'founderUrl',
    cto_text: 'ctoText',
    cto_url: 'ctoUrl',
    display_order: 'displayOrder',
    user_id: 'userId',
  });
  await fixTimestamps(authors);

  const bookCalls = db.collection('book_a_call');
  // Schema-era book_call_* keys first (none observed in data), then the real
  // Payload-era book_* keys win where both exist.
  await rename(bookCalls, {
    book_call_title: 'name',
    book_call_subtitle: 'heading',
    book_call_button_text: 'buttonText',
    book_call_button_url: 'buttonUrl',
  });
  await fillRename(bookCalls, 'book_call_image', 'image');
  await rename(bookCalls, {
    book_name: 'name',
    book_heading: 'heading',
    book_title1: 'title1',
    book_description1: 'description1',
    book_title2: 'title2',
    book_description2: 'description2',
    book_button_text: 'buttonText',
    book_button_url: 'buttonUrl',
    display_order: 'displayOrder',
    user_id: 'userId',
  });
  await fillRename(bookCalls, 'book_image', 'image');
  await fixTimestamps(bookCalls);

  const advantages = db.collection('our_advantage');
  const advMap = {
    template_name: 'templateName',
    advantage_title: 'title',
    advantage_description: 'description',
    action_heading: 'actionHeading',
    action_description: 'actionDescription',
    platform_title: 'platformTitle',
    platform_description: 'platformDescription',
    video_url: 'videoUrl',
    exp_heading: 'expHeading',
    exp_description: 'expDescription',
    display_order: 'displayOrder',
    user_id: 'userId',
  };
  for (let n = 1; n <= 7; n += 1) {
    advMap[`action_number_${n}`] = `actionNumber${n}`;
    advMap[`action_title_${n}`] = `actionTitle${n}`;
    advMap[`exp_number_${n}`] = `expNumber${n}`;
    advMap[`exp_title_${n}`] = `expTitle${n}`;
    advMap[`exp_img_${n}`] = `expImg${n}`;
    advMap[`exp_video_${n}`] = `expVideo${n}`;
  }
  await rename(advantages, advMap);
  await fillRename(advantages, 'advantage_icon', 'image'); // `image` is canonical
  await fixTimestamps(advantages);

  await mongoose.disconnect();
  console.log('rename-template-keys: done');
})().catch((err) => { console.error(err); process.exit(1); });
