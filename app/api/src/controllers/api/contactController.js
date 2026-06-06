const ContactUs = require('../../models/ContactUs');
const FreeConsultationItem = require('../../models/FreeConsultationItem');

const contact = async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ status: 'error', message: 'Name, email, and message are required' });
  const doc = await ContactUs.create({ name, email, phone, subject, message });
  res.status(201).json({ status: 'success', message: 'Message sent successfully', data: doc });
};

const freeConsultation = async (req, res) => {
  const { consultation_category_id, name, email, phone, company, message, budget } = req.body;
  if (!name || !email) return res.status(400).json({ status: 'error', message: 'Name and email are required' });
  const doc = await FreeConsultationItem.create({ consultation_category_id, name, email, phone, company, message, budget });
  res.status(201).json({ status: 'success', message: 'Consultation request submitted', data: doc });
};

module.exports = { contact, freeConsultation };
