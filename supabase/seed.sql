-- =====================================================================
--  7K Club — optional demo content. Run AFTER schema.sql.
--  Everything here can be edited or deleted later from the admin panel.
-- =====================================================================

update public.site_settings set
  about_en = 'All fun in one place. 7K Club is the largest billiard hall in Egypt — professional tables, private PlayStation rooms with PS5 & PS4, ping pong and a café menu with drinks, cakes and food.

Book your room or table online, then just show up and play. All payments are made at the lounge.',
  about_ar = 'كل المتعة في مكان واحد. 7K كلوب هو أكبر صالة بلياردو في مصر — ترابيزات احترافية، غرف بلايستيشن خاصة PS5 و PS4، بينج بونج، وكافيه فيه مشروبات وكيك وأكل.

احجز غرفتك أو ترابيزتك أونلاين وتعالى العب على طول. كل المدفوعات بتكون في الفرع.',
  phone = '0105 0009504',
  instagram_url = 'https://www.instagram.com/7kclub.official/',
  facebook_url = 'https://www.facebook.com/7kclub.official/',
  address_en = 'New Cairo, Egypt',
  address_ar = 'القاهرة الجديدة، مصر',
  updated_at = now()
where id = 1;

insert into public.announcements (title_en, title_ar, body_en, body_ar, sort_order) values
  ('All Fun In One Place',
   'كل المتعة في مكان واحد',
   'The largest billiard hall in Egypt
PS5 & PS4 private rooms · Ping pong · Café',
   'أكبر صالة بلياردو في مصر
غرف بلايستيشن PS5 و PS4 · بينج بونج · كافيه',
   1),
  ('Weekday happy hours',
   'ساعات الخصم في أيام الأسبوع',
   'Sunday to Wednesday, 12 PM – 5 PM
Book online now — pay at the lounge',
   'من الأحد للأربعاء، من ١٢ الظهر لـ ٥ العصر
احجز أونلاين دلوقتي — والدفع في الفرع',
   2);

with b as (
  insert into public.branches (name_en, name_ar, address_en, address_ar, hours_en, hours_ar, opens_at, closes_at, phone, sort_order)
  values ('7K New Cairo', '7K القاهرة الجديدة', 'New Cairo, Cairo', 'القاهرة الجديدة، القاهرة',
          'Daily 12 PM – 4 AM', 'يومياً ١٢ ظهراً – ٤ فجراً', '12:00', '04:00', '0105 0009504', 1)
  returning id
),
r as (
  insert into public.resources (branch_id, type, name_en, name_ar, description_en, description_ar, capacity, price_per_hour, sort_order)
  select b.id, x.type, x.name_en, x.name_ar, x.desc_en, x.desc_ar, x.cap, x.price, x.ord
  from b, (values
    ('ps5', 'VIP PS5 Room', 'غرفة VIP PS5', '75" 4K screen, recliners and 4 controllers.', 'شاشة 75 بوصة 4K وكراسي ريكلاينر و٤ دراعات.', 6, 250, 1),
    ('ps5', 'PS5 Room 2', 'غرفة PS5 رقم 2', '55" 4K screen, 2 controllers.', 'شاشة 55 بوصة 4K ودراعين.', 4, 150, 2),
    ('ps4', 'PS4 Classic Room', 'غرفة PS4 كلاسيك', 'Great value room with all-time favourite games.', 'غرفة اقتصادية فيها أشهر الألعاب.', 4, 90, 3),
    ('billiards', 'Billiard Table 1', 'ترابيزة بلياردو 1', 'Professional 9ft table.', 'ترابيزة احترافية ٩ قدم.', 4, 120, 4),
    ('billiards', 'Billiard Table 2', 'ترابيزة بلياردو 2', 'Professional 9ft table.', 'ترابيزة احترافية ٩ قدم.', 4, 120, 5),
    ('ping_pong', 'Ping Pong Table', 'ترابيزة بينج بونج', 'Indoor competition table, paddles included.', 'ترابيزة بطولات والمضارب متوفرة.', 4, 80, 6)
  ) as x(type, name_en, name_ar, desc_en, desc_ar, cap, price, ord)
  returning 1
)
insert into public.items (branch_id, kind, category, name_en, name_ar, description_en, description_ar, price, stock, sort_order)
select b.id, x.kind, x.cat, x.name_en, x.name_ar, x.desc_en, x.desc_ar, x.price, x.stock, x.ord
from b, (values
  ('menu', 'drinks', 'Spanish Latte', 'سبانش لاتيه', 'Iced or hot.', 'ساقع أو سخن.', 75, null::int, 1),
  ('menu', 'drinks', 'Fresh Lemon Mint', 'ليمون نعناع فريش', '', '', 55, null, 2),
  ('menu', 'drinks', 'Soft Drink', 'مشروب غازي', '', '', 30, null, 3),
  ('menu', 'cakes', 'Lotus Cheesecake', 'تشيز كيك لوتس', '', '', 95, null, 4),
  ('menu', 'cakes', 'Chocolate Fudge Cake', 'كيكة شوكولاتة فدج', '', '', 85, null, 5),
  ('menu', 'food', 'Club Sandwich', 'كلوب ساندويتش', 'Served with fries.', 'مع بطاطس.', 140, null, 6),
  ('menu', 'food', 'Chicken Wings', 'أجنحة دجاج', '8 pieces, choice of sauce.', '٨ قطع مع صوص من اختيارك.', 160, null, 7),
  ('store', 'cues', 'Pro Carbon Cue', 'عصاية كاربون احترافية', '12.5mm tip, carbon shaft.', 'رأس 12.5 مم، جسم كاربون.', 4500, 5, 8),
  ('store', 'cues', 'Classic Maple Cue', 'عصاية خشب ميبل', '', '', 1800, 10, 9),
  ('store', 'consoles', 'PlayStation 5 Slim', 'بلايستيشن 5 سليم', 'Disc edition.', 'نسخة بالقارئ.', 32000, 2, 10),
  ('store', 'accessories', 'DualSense Controller', 'دراع DualSense', '', '', 4200, 8, 11),
  ('store', 'devices', 'Gaming Headset', 'سماعة جيمنج', '', '', 2500, 6, 12)
) as x(kind, cat, name_en, name_ar, desc_en, desc_ar, price, stock, ord);
