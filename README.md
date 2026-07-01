# ERUIT — מערכת ניהול אירועים ועובדים

> מערכת RTL מלאה לניהול אירועים, עובדים, שכר ותשלומים — בנויה על React + Supabase, מוגשת דרך Vercel.

---

## תכונות

### לוח שנה
- תצוגה חודשית עם נקודות על ימים שיש בהם אירועים
- לחיצה על יום פותחת פאנל עם האירועים של אותו יום
- הוספת אירוע חדש ישירות מתוך הלוח עם תאריך ממולא אוטומטית

### ניהול אירועים
- יצירה, עריכה ומחיקה של אירועים (שם, מיקום, תאריך, שעה)
- הוספת עובדים לכל אירוע — בחירה מרשימה קיימת או הוספה ידנית
- חישוב אוטומטי של עלות האירוע לפי שכר העובדים

### ניהול עובדים
- רשימת עובדים עם שם, תפקיד וטלפון
- עובד חדש שנוסף לאירוע נשמר אוטומטית לרשימת העובדים
- פירוט אירועים וסה"כ שכר לכל עובד לפי חודש
- ייצוא PDF אישי לכל עובד

### מעקב תשלומים
- כרטיסיית תשלומים ייעודית לכל אירוע
- סימון שולם / לא שולם לכל עובד בנפרד עם תאריך תשלום
- badge אדום בניווט שמראה כמה כסף חייבים בזמן אמת
- סינון לפי חודש, שולם, לא שולם

### סיכום חודשי
- מדדים: אירועים, סה"כ שכר, עובדים ייחודיים
- טבלת חתך עובדים ממוינת לפי שכר
- פירוט תאריכים לפי עובד
- ייצוא PDF של הסיכום המלא
- ברירת מחדל: החודש הנוכחי

### הרשאות
- התחברות דרך Google בלבד
- רק `shai360hai@gmail.com` יכול למחוק אירועים ועובדים
- שאר המשתמשים יכולים לצפות ולהוסיף

---

## טכנולוגיות

| שכבה | טכנולוגיה |
|---|---|
| Frontend | React 18, Vite, CSS Modules |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth |
| Deploy | Vercel |
| PDF | jsPDF + jspdf-autotable + Noto Sans Hebrew |
| Icons | Tabler Icons |

---

## התקנה מקומית

```bash
# 1. שכפל את הרפו
git clone https://github.com/shai360hai/eruit-event-management-system.git
cd eruit-event-management-system

# 2. התקן חבילות
npm install

# 3. צור קובץ סביבה
cp .env.local.example .env.local
# מלא את ה-VITE_SUPABASE_URL וה-VITE_SUPABASE_ANON_KEY

# 4. הפעל
npm run dev
```

פתח את `http://localhost:5173`

---

## משתני סביבה

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

ב-Vercel: **Settings → Environment Variables**

---

## מסד נתונים (Supabase)

הרץ ב-SQL Editor:

```sql
-- טבלת אירועים
create table events (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  location text,
  date date,
  time text,
  workers text default '[]',
  created_at timestamp with time zone default now()
);

-- טבלת עובדים
create table workers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text,
  phone text,
  created_at timestamp with time zone default now()
);

-- טבלת תשלומים
create table payments (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references events(id) on delete cascade,
  worker_name text not null,
  amount numeric not null default 0,
  paid boolean not null default false,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  constraint payments_event_worker_unique unique (event_id, worker_name)
);

-- RLS
alter table events enable row level security;
alter table workers enable row level security;
alter table payments enable row level security;

create policy "read all events" on events for select using (true);
create policy "insert events" on events for insert with check (auth.uid() is not null);
create policy "update events" on events for update using (auth.uid() is not null);
create policy "delete events" on events for delete using (auth.jwt() ->> 'email' = 'shai360hai@gmail.com');

create policy "read all workers" on workers for select using (true);
create policy "insert workers" on workers for insert with check (auth.uid() is not null);
create policy "update workers" on workers for update using (auth.uid() is not null);
create policy "delete workers" on workers for delete using (auth.jwt() ->> 'email' = 'shai360hai@gmail.com');

create policy "allow all" on payments for all using (true) with check (true);
```

---

## Deploy לוורסל

```bash
git add .
git commit -m "your message"
git push origin main
vercel --prod
```

---

## מבנה הפרויקט

```
src/
├── components/
│   ├── Calendar.jsx        # לוח שנה חודשי
│   ├── EventForm.jsx       # טופס יצירה/עריכת אירוע
│   ├── EventsList.jsx      # רשימת אירועים
│   ├── Payments.jsx        # מעקב תשלומים
│   ├── Summary.jsx         # סיכום חודשי
│   └── WorkersList.jsx     # ניהול עובדים
├── context/
│   └── AuthContext.jsx     # Google Auth
├── fonts/                  # Noto Sans Hebrew (embedded)
├── utils/
│   ├── payments.js         # Supabase payments API
│   └── pdfExport.js        # ייצוא PDF בעברית
├── api.js                  # Supabase events API
└── supabase.js             # Supabase client
```

---

*פותח על ידי Shai Sasonker*
