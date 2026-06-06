const slugify = require('slugify');

const generateSlug = (text) =>
  slugify(text || '', { lower: true, strict: true, trim: true });

const paginateQuery = async (model, filter = {}, options = {}) => {
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 10;
  const skip = (page - 1) * limit;
  const sort = options.sort || { createdAt: -1 };
  const populate = options.populate || '';
  const select = options.select || '';

  let query = model.find(filter).sort(sort).skip(skip).limit(limit);
  if (populate) query = query.populate(populate);
  if (select) query = query.select(select);

  const [data, total] = await Promise.all([query.exec(), model.countDocuments(filter)]);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};

const parseCsvOrExcel = async (file) => {
  const ext = file.originalname.split('.').pop().toLowerCase();
  const rows = [];

  if (['csv', 'txt'].includes(ext)) {
    const content = file.buffer.toString('utf8');
    const lines = content.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      rows.push(line.split(',').map((v) => v.trim().replace(/^"|"$/g, '')));
    }
  } else if (['xls', 'xlsx'].includes(ext)) {
    const XLSX = require('xlsx');
    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const all = XLSX.utils.sheet_to_json(ws, { header: 1 });
    for (let i = 1; i < all.length; i++) {
      if (all[i].some(Boolean)) rows.push(all[i]);
    }
  }

  return rows;
};

const successResponse = (res, data, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ status: 'success', message, data });

const errorResponse = (res, message = 'Error', statusCode = 400) =>
  res.status(statusCode).json({ status: 'error', message });

module.exports = { generateSlug, paginateQuery, parseCsvOrExcel, successResponse, errorResponse };
