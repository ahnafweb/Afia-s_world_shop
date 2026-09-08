const bcrypt=require('bcryptjs');
module.exports=db=>{
 const cats=[['Fashion','fashion'],['Gadgets','gadgets'],['Home','home'],['Accessories','accessories']];
 const ins=db.prepare('INSERT OR IGNORE INTO categories(name,slug) VALUES(?,?)');
 const ids={}; cats.forEach(c=>{ins.run(...c);ids[c[1]]=db.prepare('SELECT id FROM categories WHERE slug=?').get(c[1]).id});
 if(db.prepare('SELECT COUNT(*) count FROM products').get().count===0){
  const rows=[
   ['Stylish Small Purse','stylish-small-purse','A compact everyday purse.',ids.fashion,850,25,'',1],
   ['Boys Stylish Cap','boys-stylish-cap','A casual stylish cap.',ids.fashion,450,40,'',1],
   ['Magnetic Mobile Cooler','magnetic-mobile-cooler','Compact magnetic phone cooling accessory.',ids.gadgets,1250,18,'',1],
   ['Smart Desk Lamp','smart-desk-lamp','Simple modern desk lamp.',ids.home,990,20,'',1],
   ['Minimal Wallet','minimal-wallet','Slim everyday wallet.',ids.accessories,650,30,'',0],
   ['Portable Mini Fan','portable-mini-fan','Small rechargeable desk fan.',ids.gadgets,780,22,'',0],
   ['Desk Organizer','desk-organizer','Useful organizer.',ids.home,550,35,'',0],
   ['Everyday Sunglasses','everyday-sunglasses','Simple everyday sunglasses.',ids.accessories,720,15,'',0]
  ];
  const s=db.prepare(`INSERT INTO products(name,slug,description,category_id,price,stock,image,featured) VALUES(?,?,?,?,?,?,?,?)`);
  db.transaction(rs=>rs.forEach(r=>s.run(...r)))(rows);
 }
 const email=process.env.ADMIN_EMAIL || 'admin@afiasworld.local';
 const password=process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? null : 'ChangeMe123!');
 if(!password) throw new Error('ADMIN_PASSWORD must be set in production.');
 const admin=db.prepare('SELECT id, role FROM users WHERE email=?').get(email);
 if(!admin){
  db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)')
   .run('Afia Admin',email,bcrypt.hashSync(password,12),'admin');
 } else if(admin.role !== 'admin') {
  db.prepare("UPDATE users SET role='admin' WHERE id=?").run(admin.id);
 }
};
