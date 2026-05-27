import { createClient } from '@supabase/supabase-js';

// Инициализация клиента Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

export default async function handler(req, res) {
  // Проверяем метод запроса
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Получаем данные из запроса
  const { code, name, address } = req.body;

  // Проверяем, что передан хотя бы один параметр
  if (!code && !name && !address) {
    return res.status(400).json({ error: 'At least one search parameter required' });
  }

  // Создаём клиент
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Формируем запрос
  let query = supabase
    .from('inventory')
    .select(`
      *,
      product:products(code, name, brand, season),
      address:addresses(code, zone_prefix, warehouse_id),
      warehouse:warehouses(name, priority)
    `);

  // Добавляем фильтры
  if (code) {
    query = query.eq('product.code', code);
  }
  
  if (name) {
    // Поиск по названию (нечёткий)
    query = query.ilike('product.name', `%${name}%`);
  }
  
  if (address) {
    // Поиск по адресу (нечёткий)
    query = query.ilike('addresses.code', `%${address}%`);
  }

  // Выполняем запрос
  const { data, error } = await query.limit(100);

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }

  // Возвращаем результаты
  return res.status(200).json(data);
}