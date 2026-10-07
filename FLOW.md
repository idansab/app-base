# זרימת הצעת מקום חדש

## 1️⃣ משתמש מעלה הצעה מהאתר
```
Frontend Form (create-place.tsx)
  ↓
POST /api/places {
  name: "קפה לוי",
  category: "food",
  city: "חיפה",
  ...
}
```

## 2️⃣ בקשה מגיעה ל-Backend
```javascript
// server.js - POST /api/places
const place = {
  id: uuidv4(),
  ...req.body,
  status: 'pending',  // 🔴 ממתין לאישור!
  created_by_id: 'user-123',
  created_at: new Date().toISOString(),
};

// זה בספריים לוspbased
await supabase.from('places').insert([place]);
```

## 3️⃣ Database שומר את ה-place עם status="pending"
```
places table:
┌─────┬──────────────┬────────┐
│ id  │ name         │ status │
├─────┼──────────────┼────────┤
│ 123 │ קפה לוי      │pending │ 🔴
└─────┴──────────────┴────────┘
```

## 4️⃣ Admin Dashboard קורא את ה-pending places
```javascript
// GET /api/places?status=pending
// רואה רק הצעות חדשות שממתינות לאישור
```

## 5️⃣ Admin מאשר או דוחה
```javascript
// PATCH /api/places/123/status
// { status: "approved" } או { status: "rejected" }

await supabase.from('places')
  .update({ status: 'approved' })
  .eq('id', '123');
```

## 6️⃣ Frontend מרענן וירה את המקום החדש
```javascript
// GET /api/places?status=approved
// עכשיו מקום 123 מופיע ברשימה הכללית! ✅
```

---

## התוכנה כרגע:
✅ Backend תומך ב-POST /api/places (יוצר עם status='approved')
✅ Backend תומך ב-PATCH /api/places/:id/status
❌ Frontend - אין עדיין form להעלאת מקום
❌ Admin Dashboard - אין עדיין ממשק ניהול
