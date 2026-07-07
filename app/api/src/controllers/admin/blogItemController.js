const BlogItem = require('../../models/BlogItem');
const BlogCategory = require('../../models/BlogCategory');
const BlogSubCategory = require('../../models/BlogSubCategory');
const createCrudController = require('./crudFactory');

const base = createCrudController(BlogItem, {
  imageFields: ['thumbnail'],
  searchFields: ['title', 'slug'],
  defaultSort: { createdAt: -1 },
  parentField: ['blogCategoryId', 'blogSubCategoryId'],
  // Resolve the category / sub-category names for the list/detail responses.
  lookups: [
    {
      localField: 'blogCategoryId',
      model: BlogCategory,
      nameField: 'name',
      as: 'blogCategoryName',
    },
    {
      localField: 'blogSubCategoryId',
      model: BlogSubCategory,
      nameField: 'name',
      as: 'blogSubCategoryName',
    },
  ],
  // The Blog Slug field was removed from the admin form, so derive a unique
  // `slug` from the title here. This is the slug the public web app looks
  // posts up by (/blog/detail/:slug and the blog listing links).
  slugField: 'slug',
  slugSource: 'title',
});

module.exports = { ...base };
