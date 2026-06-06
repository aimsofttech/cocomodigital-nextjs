const router = require('express').Router();
const ctrl = require('../../controllers/api/blogController');

router.get('/', ctrl.blog);
router.get('/categories', ctrl.blogCategory);
router.get('/items', ctrl.getBlogItemBySlug);
router.get('/items/:id', ctrl.getBlogItemDetailById);
router.get('/detail/:blog_item_slug', ctrl.getBlogDetail);

module.exports = router;
