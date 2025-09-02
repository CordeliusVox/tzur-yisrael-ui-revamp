export const getMockComplaints = (userId?: string) => {
  const now = new Date();
  
  return [
    {
      id: '1',
      title: 'תקלה בחדר המחשבים',
      description: 'המחשבים בחדר 101 לא פועלים כבר שבוע. צריך תיקון דחוף.',
      category: 'טכני',
      status: 'לא שויך',
      submitter_id: userId || 'user1',
      assigned_to: null,
      created_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago - CRITICAL
      updated_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      submitter: 'דני כהן',
      submitterEmail: 'danny.cohen@school.edu',
      submitterPhone: '050-1234567',
      date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toLocaleDateString('he-IL'),
      assignedTo: null,
      updates: []
    },
    {
      id: '2',
      title: 'בעיה בניקיון השירותים',
      description: 'השירותים בקומה השנייה לא נוקו כבר כמה ימים.',
      category: 'ניקיון',
      status: 'פתוח',
      submitter_id: userId || 'user2',
      assigned_to: null,
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago - WARNING
      updated_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      submitter: 'רחל לוי',
      submitterEmail: 'rachel.levi@school.edu',
      submitterPhone: '052-7654321',
      date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString('he-IL'),
      assignedTo: null,
      updates: []
    },
    {
      id: '3',
      title: 'בעיית בטיחות במגרש',
      description: 'יש חור במגרש הכדורסל שעלול לגרום לפציעות.',
      category: 'בטיחות',
      status: 'בטיפול',
      submitter_id: userId || 'user3',
      assigned_to: userId,
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago - WARNING
      updated_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      submitter: 'מיכל אברהם',
      submitterEmail: 'michal.avraham@school.edu',
      submitterPhone: '053-9876543',
      date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toLocaleDateString('he-IL'),
      assignedTo: 'אדמין מערכת',
      updates: [
        {
          date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toLocaleDateString('he-IL'),
          time: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
          author: 'אדמין מערכת',
          message: 'הפנייה שויכה לטיפול'
        }
      ]
    },
    {
      id: '4',
      title: 'בקשה לתיקון דלת הכיתה',
      description: 'הדלת של כיתה 201 לא נסגרת כמו שצריך.',
      category: 'אחר',
      status: 'לא שויך',
      submitter_id: userId || 'user4',
      assigned_to: null,
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago - NEW
      updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      submitter: 'יוסי דוד',
      submitterEmail: 'yossi.david@school.edu',
      submitterPhone: '054-1122334',
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString('he-IL'),
      assignedTo: null,
      updates: []
    },
    {
      id: '5',
      title: 'בעיה עם המזגן בספרייה',
      description: 'המזגן בספרייה לא עובד טוב ובחדר חם מאוד.',
      category: 'טכני',
      status: 'פתוח',
      submitter_id: userId || 'user5',
      assigned_to: null,
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago - NEW
      updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      submitter: 'שרה גולד',
      submitterEmail: 'sara.gold@school.edu',
      submitterPhone: '055-4433221',
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString('he-IL'),
      assignedTo: null,
      updates: []
    },
    {
      id: '6',
      title: 'בקשה להוספת פח אשפה',
      description: 'חסר פח אשפה בחצר ליד ספסלי הישיבה.',
      category: 'ניקיון',
      status: 'לא שויך',
      submitter_id: userId || 'user6',
      assigned_to: null,
      created_at: new Date().toISOString(), // Today - NEW
      updated_at: new Date().toISOString(),
      submitter: 'אבי מרדכי',
      submitterEmail: 'avi.mordechai@school.edu',
      submitterPhone: '056-7788990',
      date: new Date().toLocaleDateString('he-IL'),
      assignedTo: null,
      updates: []
    },
    {
      id: '7',
      title: 'תקלה דחופה במערכת החשמל',
      description: 'הפסקות חשמל בכל המבנה - בעיה דחופה וקריטית!',
      category: 'טכני',
      status: 'לא שויך',
      submitter_id: userId || 'user7',
      assigned_to: null,
      created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago - CRITICAL
      updated_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      submitter: 'מנהל המתקן',
      submitterEmail: 'facility@school.edu',
      submitterPhone: '050-1111111',
      date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toLocaleDateString('he-IL'),
      assignedTo: null,
      updates: []
    },
    {
      id: '8',
      title: 'בעיה עם החימום בכיתות',
      description: 'מערכת החימום לא עובדת בכיתות הצפוניות.',
      category: 'טכני',
      status: 'בטיפול',
      submitter_id: userId || 'user8',
      assigned_to: userId,
      created_at: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago - WARNING
      updated_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      submitter: 'צוות הוראה',
      submitterEmail: 'teachers@school.edu',
      submitterPhone: '054-2222222',
      date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toLocaleDateString('he-IL'),
      assignedTo: 'טכנאי בניין',
      updates: [
        {
          date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString('he-IL'),
          time: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
          author: 'טכנאי בניין',
          message: 'נבדקת המערכת, הוזמנו חלקי חילוף'
        }
      ]
    },
    {
      id: '9',
      title: 'תלונה על רעש בשעות הלימוד',
      description: 'עבודות שיפוץ גורמות לרעש מופרע במהלך השיעורים.',
      category: 'אחר',
      status: 'הושלם',
      submitter_id: userId || 'user9',
      assigned_to: userId,
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago - NEW (but completed)
      updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      submitter: 'מורה ראשי',
      submitterEmail: 'head.teacher@school.edu',
      submitterPhone: '053-3333333',
      date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString('he-IL'),
      assignedTo: 'מנהל',
      updates: [
        {
          date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString('he-IL'),
          time: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
          author: 'מנהל',
          message: 'תואם עם קבלן השיפוץ על שעות עבודה'
        },
        {
          date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString('he-IL'),
          time: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
          author: 'מנהל',
          message: 'הבעיה נפתרה - עבודות יתבצעו רק אחרי השעות'
        }
      ]
    }
  ];
};