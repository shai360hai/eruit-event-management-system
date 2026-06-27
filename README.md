# ERUIT — מערכת ניהול אירועים

מערכת RTL לניהול אירועים, עובדים ושכר.

## תכונות
- ניהול אירועים (שם, מיקום, תאריך, שעה)
- הוספת עובדים לכל אירוע עם תפקיד ושכר
- חישוב אוטומטי של עלות האירוע
- סיכום חודשי לפי עובד עם פירוט תאריכים

## התקנה מקומית

```bash
npm install
npm run dev
```

> ⚠️ הנתונים נשמרים ב-`data/events.json`. בסביבה מקומית הכל עובד.  
> בוורסל, הקובץ יאופס בכל deploy — ראה הערה למטה.

## Deploy לוורסל

```bash
# 1. דחוף ל-GitHub
git add .
git commit -m "init eruit"
git push

# 2. ב-Vercel:
#    - Import repository
#    - Framework: Vite
#    - Build command: npm run build
#    - Output directory: dist
#    - לחץ Deploy
```

## הערה על אחסון נתונים

Vercel היא סביבה Serverless — קבצים שנכתבים ב-runtime **לא נשמרים לצמיתות**.  
לנתונים קבועים מומלץ לעבור ל-**Supabase** (חינמי) או **PlanetScale**.
