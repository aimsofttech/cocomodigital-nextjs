const Client = require('../../models/Client');
const { buildS3Url } = require('../../utils/s3Upload');
const buildUrl = (key) => (key ? buildS3Url(key) : '');

const getClientViewAll = async (req, res) => {
  const clients = await Client.find({ status: 1 }).sort({ display_order: 1 })
    .populate('author_template_id', 'author_name author_image author_designation')
    .populate('book_call_template_id', 'book_call_title book_call_button_url');
  res.json({ status: 'success', data: clients.map((c) => ({ ...c.toObject(), client_img: buildUrl(c.client_img), image: buildUrl(c.client_img) })) });
};

const getClientDetail = async (req, res) => {
  const { client_slug } = req.params;
  const client = await Client.findOne({ client_slug, status: 1 })
    .populate('author_template_id')
    .populate('book_call_template_id');
  if (!client) return res.status(404).json({ status: 'error', message: 'Client not found' });
  res.json({ status: 'success', data: { ...client.toObject(), client_img: buildUrl(client.client_img) } });
};

module.exports = { getClientViewAll, getClientDetail };
