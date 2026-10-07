-- =====================================================================
--  7K Club — Sheikh Zayed branch: rooms, tables, menu, store + opening ad.
--  Run AFTER schema.sql in Supabase → SQL Editor. Safe to run twice:
--  if the branch already exists, nothing is inserted.
--  Prices and phone number are sample values — edit them from the admin panel.
-- =====================================================================

do $$
declare
  b uuid;
begin
  select id into b from public.branches where name_en = '7K Sheikh Zayed';
  if b is not null then
    raise notice '7K Sheikh Zayed already exists (%), skipping.', b;
    return;
  end if;

  -- Branch ------------------------------------------------------------
  insert into public.branches
    (name_en, name_ar, address_en, address_ar, hours_en, hours_ar, opens_at, closes_at, phone, map_url, sort_order)
  values
    ('7K Sheikh Zayed', '7K الشيخ زايد',
     'Sheikh Zayed City, Giza', 'مدينة الشيخ زايد، الجيزة',
     'Daily 1 PM – 3 AM', 'يومياً ١ ظهراً – ٣ فجراً',
     '13:00', '03:00',
     '0105 0009504',
     'https://www.google.com/maps/search/?api=1&query=Sheikh+Zayed+City+Giza',
     2)
  returning id into b;

  -- Rooms & tables ----------------------------------------------------
  insert into public.resources
    (branch_id, type, name_en, name_ar, description_en, description_ar, capacity, price_per_hour, sort_order)
  select b, x.type, x.name_en, x.name_ar, x.desc_en, x.desc_ar, x.cap, x.price, x.ord
  from (values
    ('ps5', 'Zayed VIP Suite', 'جناح زايد VIP',
     '85" 4K HDR screen, recliners, surround sound and 4 controllers.',
     'شاشة 85 بوصة 4K HDR، كراسي ريكلاينر، صوت محيطي و٤ دراعات.', 8, 300, 1),
    ('ps5', 'VIP PS5 Room', 'غرفة VIP PS5',
     '75" 4K screen, leather sofa and 4 controllers.',
     'شاشة 75 بوصة 4K، كنبة جلد و٤ دراعات.', 6, 250, 2),
    ('ps5', 'PS5 Room 3', 'غرفة PS5 رقم 3',
     '55" 4K screen and 2 controllers — perfect for duos.',
     'شاشة 55 بوصة 4K ودراعين — مثالية لشخصين.', 4, 150, 3),
    ('ps5', 'PS5 Room 4', 'غرفة PS5 رقم 4',
     '55" 4K screen and 2 controllers.',
     'شاشة 55 بوصة 4K ودراعين.', 4, 150, 4),
    ('ps4', 'PS4 Classic Room 1', 'غرفة PS4 كلاسيك 1',
     'Great value room with FIFA, PES and all-time favourites.',
     'غرفة اقتصادية فيها فيفا وبيس وأشهر الألعاب.', 4, 90, 5),
    ('ps4', 'PS4 Classic Room 2', 'غرفة PS4 كلاسيك 2',
     'Great value room with FIFA, PES and all-time favourites.',
     'غرفة اقتصادية فيها فيفا وبيس وأشهر الألعاب.', 4, 90, 6),
    ('billiards', 'Pro Billiard Table 1', 'ترابيزة بلياردو احترافية 1',
     'Professional 9ft table, carbon cues available.',
     'ترابيزة احترافية ٩ قدم، وعصي كاربون متاحة.', 4, 130, 7),
    ('billiards', 'Pro Billiard Table 2', 'ترابيزة بلياردو احترافية 2',
     'Professional 9ft table, carbon cues available.',
     'ترابيزة احترافية ٩ قدم، وعصي كاربون متاحة.', 4, 130, 8),
    ('billiards', 'Billiard Table 3', 'ترابيزة بلياردو 3',
     'Classic 8ft table.', 'ترابيزة كلاسيك ٨ قدم.', 4, 110, 9),
    ('billiards', 'Billiard Table 4', 'ترابيزة بلياردو 4',
     'Classic 8ft table.', 'ترابيزة كلاسيك ٨ قدم.', 4, 110, 10),
    ('billiards', 'VIP Billiard Lounge', 'صالة بلياردو VIP',
     'Private room with a 9ft table, seating area and TV.',
     'غرفة خاصة فيها ترابيزة ٩ قدم، قعدة وشاشة.', 6, 200, 11),
    ('ping_pong', 'Ping Pong Table 1', 'ترابيزة بينج بونج 1',
     'Indoor competition table, paddles and balls included.',
     'ترابيزة بطولات داخلية، المضارب والكور متوفرة.', 4, 80, 12),
    ('ping_pong', 'Ping Pong Table 2', 'ترابيزة بينج بونج 2',
     'Indoor competition table, paddles and balls included.',
     'ترابيزة بطولات داخلية، المضارب والكور متوفرة.', 4, 80, 13)
  ) as x(type, name_en, name_ar, desc_en, desc_ar, cap, price, ord);

  -- Menu + store items -------------------------------------------------
  insert into public.items
    (branch_id, kind, category, name_en, name_ar, description_en, description_ar, price, stock, sort_order)
  select b, x.kind, x.cat, x.name_en, x.name_ar, x.desc_en, x.desc_ar, x.price, x.stock, x.ord
  from (values
    -- Drinks
    ('menu', 'drinks', 'Espresso', 'إسبريسو', 'Single or double shot.', 'سينجل أو دبل شوت.', 45, null::int, 1),
    ('menu', 'drinks', 'Cappuccino', 'كابتشينو', '', '', 60, null, 2),
    ('menu', 'drinks', 'Spanish Latte', 'سبانش لاتيه', 'Iced or hot.', 'ساقع أو سخن.', 75, null, 3),
    ('menu', 'drinks', 'Iced Mocha', 'آيس موكا', '', '', 80, null, 4),
    ('menu', 'drinks', 'Turkish Coffee', 'قهوة تركي', '', '', 40, null, 5),
    ('menu', 'drinks', 'Tea', 'شاي', 'Green, black or mint.', 'أخضر، أسود أو بالنعناع.', 30, null, 6),
    ('menu', 'drinks', 'Fresh Mango Juice', 'عصير مانجو فريش', '', '', 65, null, 7),
    ('menu', 'drinks', 'Fresh Lemon Mint', 'ليمون نعناع فريش', '', '', 55, null, 8),
    ('menu', 'drinks', 'Blue Mojito', 'بلو موهيتو', '', '', 70, null, 9),
    ('menu', 'drinks', 'Energy Drink', 'مشروب طاقة', '', '', 60, null, 10),
    ('menu', 'drinks', 'Soft Drink', 'مشروب غازي', '', '', 30, null, 11),
    ('menu', 'drinks', 'Mineral Water', 'مياه معدنية', '', '', 15, null, 12),
    -- Cakes & desserts
    ('menu', 'cakes', 'Lotus Cheesecake', 'تشيز كيك لوتس', '', '', 95, null, 13),
    ('menu', 'cakes', 'Molten Chocolate Cake', 'مولتن كيك', 'Served warm with vanilla ice cream.', 'تُقدم سخنة مع آيس كريم فانيليا.', 100, null, 14),
    ('menu', 'cakes', 'Brownies', 'براونيز', '', '', 70, null, 15),
    ('menu', 'cakes', 'Nutella Waffle', 'وافل نوتيلا', '', '', 90, null, 16),
    -- Food
    ('menu', 'food', 'Club Sandwich', 'كلوب ساندويتش', 'Served with fries.', 'مع بطاطس.', 140, null, 17),
    ('menu', 'food', 'Classic Beef Burger', 'برجر لحم كلاسيك', '150g beef, cheddar, fries.', '١٥٠ جم لحم، شيدر، بطاطس.', 175, null, 18),
    ('menu', 'food', 'Chicken Wings', 'أجنحة دجاج', '8 pieces, choice of sauce.', '٨ قطع مع صوص من اختيارك.', 160, null, 19),
    ('menu', 'food', 'Margherita Pizza', 'بيتزا مارجريتا', '', '', 150, null, 20),
    ('menu', 'food', 'Loaded Nachos', 'ناتشوز', 'Cheese sauce, jalapeños, salsa.', 'صوص جبنة، هالابينو، صلصة.', 110, null, 21),
    ('menu', 'food', 'French Fries', 'بطاطس محمرة', '', '', 55, null, 22),
    -- Store: billiard cues
    ('store', 'cues', 'Pro Carbon Cue', 'عصاية كاربون احترافية', '12.5mm tip, carbon shaft.', 'رأس 12.5 مم، جسم كاربون.', 4500, 4, 23),
    ('store', 'cues', 'Classic Maple Cue', 'عصاية خشب ميبل', '', '', 1800, 8, 24),
    ('store', 'cues', 'Cue Hard Case', 'شنطة عصاية', 'Holds 1 butt + 2 shafts.', 'تشيل جسم و٢ رأس.', 950, 6, 25),
    ('store', 'cues', 'Chalk & Glove Set', 'طقم طباشير وجوانتي', '', '', 250, 20, 26),
    -- Store: consoles
    ('store', 'consoles', 'PlayStation 5 Slim (Disc)', 'بلايستيشن 5 سليم (بالقارئ)', '', '', 32000, 2, 27),
    ('store', 'consoles', 'PlayStation 5 Slim (Digital)', 'بلايستيشن 5 سليم (ديجيتال)', '', '', 27500, 2, 28),
    -- Store: accessories
    ('store', 'accessories', 'DualSense Controller', 'دراع DualSense', '', '', 4200, 10, 29),
    ('store', 'accessories', 'DualSense Edge Controller', 'دراع DualSense Edge', 'Pro controller.', 'دراع احترافي.', 11500, 3, 30),
    ('store', 'accessories', 'DualSense Charging Station', 'شاحن دراعات DualSense', '', '', 1600, 6, 31),
    -- Store: devices
    ('store', 'devices', 'Gaming Headset', 'سماعة جيمنج', '', '', 2500, 6, 32),
    ('store', 'devices', 'Pulse 3D Wireless Headset', 'سماعة Pulse 3D لاسلكي', '', '', 5200, 3, 33)
  ) as x(kind, cat, name_en, name_ar, desc_en, desc_ar, price, stock, ord);

  -- Home page advertisement for the opening ------------------------------
  insert into public.announcements (title_en, title_ar, body_en, body_ar, link_url, sort_order)
  values (
    'Now open in Sheikh Zayed',
    'افتتاح فرع الشيخ زايد',
    'VIP PS5 suites · 5 billiard tables · Ping pong
Book online now — pay at the lounge',
    'أجنحة PS5 VIP · ٥ ترابيزات بلياردو · بينج بونج
احجز أونلاين دلوقتي — والدفع في الفرع',
    '/branches/' || b,
    0
  );

  raise notice '7K Sheikh Zayed created: %', b;
end $$;
