const Client = require('../../models/Client');
const { buildS3Url } = require('../../utils/s3Upload');
const buildUrl = (key) => (key ? buildS3Url(key) : '');

const getClientViewAll = async (req, res) => {
  const clients = await Client.find({ status: 1 }).sort({ displayOrder: 1 })
    .populate('authorTemplateId', 'name image designation')
    .populate('bookCallTemplateId', 'name heading buttonText buttonUrl');
  res.json({ status: 'success', data: clients.map((c) => ({ ...c.toObject(), image: buildUrl(c.image) })) });
};

const getClientDetail = async (req, res) => {
  const { client_slug } = req.params;
  const client = await Client.findOne({ slug: client_slug, status: 1 })
    .populate('authorTemplateId')
    .populate('bookCallTemplateId');
  if (!client) return res.status(404).json({ status: 'error', message: 'Client not found' });
  res.json({ status: 'success', data: { ...client.toObject(), image: buildUrl(client.image) } });
};

module.exports = { getClientViewAll, getClientDetail };
