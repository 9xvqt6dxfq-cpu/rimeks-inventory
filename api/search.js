import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, name, address } = req.body;

  if (!code && !name && !address) {
    return res.status(400).json({ error: 'At least one search parameter required' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Начинаем запрос
  let query = supabase
    .from('inventory')
    .select(`
      *,
      product:products(code, name, brand, season),
      address:addresses(code, zone_prefix, warehouse_id)
    `);

  // Добавляем фильтры
  if (code) {
    query = query.eq('product.code', code);
  }
  
  if (name) {
    query = query.ilike('product.name', `%${name}%`);
  }
  
  if (address) {
    query = query.ilike('addresses.code', `%${address}%`);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }

  // Если есть данные, попробуем получить информацию о складе отдельно
  if (data && data.length > 0) {
    // Получаем warehouse_id из первого адреса
    const warehouseId = data[0].address?.warehouse_id;
    
    if (warehouseId) {
      // Отдельный запрос к таблице warehouses
      const { data: warehouseData } = await supabase
        .from('warehouses')
        .select('name, priority')
        .eq('id', warehouseId)
        .single();
      
      // Добавляем информацию о складе к каждому результату
      data.forEach(item => {
        item.warehouse = warehouseData;
      });
    }
  }

  return res.status(200).json(data);
}