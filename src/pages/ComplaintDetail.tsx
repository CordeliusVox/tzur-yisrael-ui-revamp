// ComplaintDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight,
  GraduationCap,
  Calendar,
  User,
  FileText,
  AlertTriangle,
  Send,
  Trash2,
  Download,
  Check
} from "lucide-react";

// Shared types
type Complaint = {
  id: string;
  title: string;
  submitter: string;
  submitterEmail?: string;
  submitterPhone?: string;
  category: string;
  date: string;
  description: string;
  assignedTo?: string | null;
  visible: boolean;
};

const STORAGE_KEY = "complaints_v1";

const ComplaintDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [response, setResponse] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Load from storage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const list: Complaint[] = saved ? (() => { try { return JSON.parse(saved); } catch { return []; } })() : [];
    setAllComplaints(list);
    const c = list.find((x) => x.id === id);
    setComplaint(c ?? null);
  }, [id]);

  const saveComplaint = (updated: Complaint) => {
    setComplaint(updated);
    const next = allComplaints.map((c) => (c.id === updated.id ? updated : c));
    setAllComplaints(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const username = useMemo(() => localStorage.getItem("username") || "מערכת", []);

  if (!complaint) {
    return (
      <div className="min-h-screen flex items-center justify-center rtl">
        <Card className="card-elegant max-w-md">
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="hebrew-subtitle mb-2">פנייה לא נמצאה</h2>
            <p className="text-muted-foreground hebrew-body mb-4">
              מס' הפנייה שביקשתם אינו קיים במערכת
            </p>
            <Button onClick={() => navigate("/complaints")} className="rounded-xl">
              חזרה לרשימת הפניות
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDeleteComplaint = async () => {
    setIsDeleting(true);
    setTimeout(() => {
      const remaining = allComplaints.filter((c) => c.id !== complaint.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
      toast({
        title: "פנייה נמחקה בהצלחה",
        description: "הפנייה הוסרה מהמערכת",
      });
      setIsDeleting(false);
      navigate("/complaints");
    }, 600);
  };

  const handleFinishComplaint = async () => {
    setIsFinishing(true);
    try {
      // Update visibility in database
      const { error } = await supabase
        .from('complaints')
        .update({ visible: false })
        .eq('id', complaint.id);

      if (error) throw error;

      // Update local storage
      const updated: Complaint = {
        ...complaint,
        visible: false,
      };
      saveComplaint(updated);

      toast({
        title: "הפנייה הושלמה",
        description: "הפנייה לא תוצג יותר ברשימה",
      });

      // Navigate back after short delay
      setTimeout(() => {
        navigate("/complaints");
      }, 1000);
    } catch (error) {
      console.error("Error finishing complaint:", error);
      toast({
        title: "שגיאה",
        description: "נכשל בסיום הפנייה",
        variant: "destructive",
      });
    } finally {
      setIsFinishing(false);
    }
  };

  // ----------------------------
  // No-deps DOCX HTML template filling (uses user's provided HTML)
  // ----------------------------
  const escapeHtml = (str: string) =>
    String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const nl2br = (s: string) => escapeHtml(s).replace(/\r\n|\n\r|\n|\r/g, "<br>");

  const handleDownloadComplaint = () => {
    if (!complaint) return;

    // Fill data
    const openingDate = escapeHtml(complaint.date || "");
    const feedbackDate = new Date().toLocaleDateString("he-IL");
    const customerName = escapeHtml(complaint.submitter || "");
    const unit = escapeHtml(complaint.category || "");
    const responderName = escapeHtml(username || "מערכת");
    const complaintDetailsHtml = nl2br(complaint.description || "");
    // Use the typed response (if present) as the "התייחסות" field; otherwise use assignedTo or empty.
    const responseHtml = nl2br(response || complaint.assignedTo || "");

    // If you want to show a logo, put its URL here (public folder) e.g. "/logo.png"
    const logoUrl = ""; // optional

    // The template is your provided HTML — I removed the external image tag (to avoid broken link).
    // Placeholders: {{openingDate}}, {{feedbackDate}}, {{customerName}}, {{unit}},
    // {{responderName}}, {{complaintDetails}}, {{responseText}}, {{logoUrl}}
    const template = `<!doctype html>
<html>

<head>
<meta http-equiv=Content-Type content="text/html; charset=utf-8">
<meta name=Generator content="Microsoft Word 15 (filtered)">
<style>
<!--
 /* Font Definitions */
 @font-face
	{font-family:"Cambria Math";
	panose-1:2 4 5 3 5 4 6 3 2 4;}
@font-face
	{font-family:Calibri;
	panose-1:2 15 5 2 2 2 4 3 2 4;}
@font-face
	{font-family:Tahoma;
	panose-1:2 11 6 4 3 5 4 4 2 4;}
@font-face
	{font-family:Georgia;
	panose-1:2 4 5 2 5 4 5 2 3 3;}
 /* Style Definitions */
 p.MsoNormal, li.MsoNormal, div.MsoNormal
	{margin-top:0in;
	margin-right:-.05pt;
	margin-bottom:0in;
	margin-left:0in;
	text-align:left;
	text-indent:-.05pt;
	direction:rtl;
	unicode-bidi:embed;
	font-size:12.0pt;
	font-family:"Times New Roman",serif;
	position:relative;
	top:.5pt;}
.MsoChpDefault
	{font-size:10.0pt;}
 /* Page Definitions */
 @page WordSection1
	{size:595.3pt 841.9pt;
	margin:42.55pt 56.65pt 1.0in 21.3pt;}
div.WordSection1
	{page:WordSection1;}
-->
</style>

</head>

<body lang=EN-US link=blue vlink=purple style='word-wrap:break-word'>

<div class=WordSection1>

<p class=MsoNormal align=left dir=RTL style='margin-right:0in;text-align:right;
text-indent:-.1pt;line-height:115%;border:none'><span dir=LTR style='font-size:
11.0pt;line-height:115%;font-family:"Arial",sans-serif;color:black'>&nbsp;</span></p>

<div align=left>

<table class=4 dir=rtl border=0 cellspacing=0 cellpadding=0 align=left
 width=240 style='border-collapse:collapse;margin-left:6.75pt;margin-right:
 6.75pt'>
 <tr>
  <td width=144 valign=top style='width:1.5in;padding:0in 5.4pt 0in 5.4pt'>
  <p class=MsoNormal dir=RTL style='margin-right:0in;text-align:justify;
  text-indent:-.1pt;line-height:normal;border:none'><span lang=HE
  style='color:black'>חיל</span></p>
  </td>
  <td width=96 valign=top style='width:1.0in;padding:0in 5.4pt 0in 5.4pt'>
  <p class=MsoNormal align=left dir=RTL style='margin-right:0in;text-align:
  right;text-indent:-.1pt;line-height:normal;border:none'><span lang=HE
  style='color:black'>האוויר</span></p>
  </td>
 </tr>
 <tr>
  <td width=144 valign=top style='width:1.5in;padding:0in 5.4pt 0in 5.4pt'>
  <p class=MsoNormal dir=RTL style='margin-right:0in;text-align:justify;
  text-indent:-.1pt;line-height:normal;border:none'><span lang=HE
  style='color:black'>המכללה   הטכנולוגית</span></p>
  </td>
  <td width=96 valign=top style='width:1.0in;padding:0in 5.4pt 0in 5.4pt'>
  <p class=MsoNormal align=left dir=RTL style='margin-right:0in;text-align:
  right;text-indent:-.1pt;line-height:normal;border:none'><span lang=HE
  style='color:black'>באר -  שבע</span></p>
  </td>
 </tr>
 <tr>
  <td width=144 valign=top style='width:1.5in;padding:0in 5.4pt 0in 5.4pt'>
  <p class=MsoNormal dir=RTL style='margin-right:0in;text-align:justify;
  text-indent:-.1pt;line-height:normal;border:none'><span lang=HE
  style='color:black'>טלפון</span></p>
  <p class=MsoNormal dir=RTL style='margin-right:0in;text-align:justify;
  text-indent:-.1pt;line-height:normal;border:none'><span lang=HE
  style='color:black'>סימוכין</span></p>
  </td>
  <td width=96 valign=top style='width:1.0in;padding:0in 5.4pt 0in 5.4pt'>
  <p class=MsoNormal align=left dir=RTL style='margin-right:0in;text-align:
  right;text-indent:-.1pt;line-height:normal;border:none'><span dir=LTR></span><span
  dir=LTR></span><span dir=LTR style='color:black'><span dir=LTR></span><span
  dir=LTR></span>08-9907410/2</span></p>
  <p class=MsoNormal align=left dir=RTL style='margin-right:0in;text-align:
  right;text-indent:-.1pt;line-height:normal;border:none'><span lang=HE
  style='color:black'>תשפ&quot;ו</span></p>
  </td>
 </tr>
 <tr style='height:16.45pt'>
  <td width=144 valign=top style='width:1.5in;padding:0in 5.4pt 0in 5.4pt;
  height:16.45pt'>
  <p class=MsoNormal dir=RTL style='margin-right:0in;text-align:justify;
  text-indent:-.1pt;line-height:normal;border:none'><span lang=HE
  style='color:black'>תאריך                               </span></p>
  </td>
  <td width=96 valign=top style='width:1.0in;padding:0in 5.4pt 0in 5.4pt;
  height:16.45pt'>
  <p class=MsoNormal align=left dir=RTL style='margin-right:0in;text-align:
  right;text-indent:-.1pt;line-height:normal;border:none'><span dir=LTR
  style='background:yellow'>{{openingDate}}</span></p>
  </td>
 </tr>
</table>

</div>

<p class=MsoNormal dir=RTL style='margin-right:0in;text-align:justify;
text-indent:-.1pt;line-height:normal;border:none'><span dir=LTR style='color:black'><!-- logo removed to avoid broken link; set logoUrl variable to show logo --></span></p>

<p class=MsoNormal dir=RTL style='margin-right:0in;text-align:justify;
text-indent:-.1pt;line-height:normal;border:none'><span dir=LTR
style='color:black'>&nbsp;</span></p>

<p class=MsoNormal align=center dir=RTL style='margin-right:.05pt;text-align:
center;text-indent:-.15pt;line-height:150%;border:none'><b><u><span lang=HE
style='font-size:14.0pt;line-height:150%;font-family:"Calibri",sans-serif;
color:black'>משוב לתלונת לקוח</span></u></b></p>

<p class=MsoNormal align=center dir=RTL style='margin-right:0in;text-align:
center;text-indent:-.1pt;line-height:150%;border:none'><span lang=HE
style='font-family:"Calibri",sans-serif;color:#A6A6A6'>תלונת לקוח היא מנוף
לשיפור מתמיד, להתחדשות, להבטחת איכות, בקרה ואכיפה של תרבות ארגונית</span></p>

<p class=MsoNormal align=center dir=RTL style='margin-right:0in;text-align:
center;text-indent:-.1pt;line-height:150%;border:none'><u><span dir=LTR
style='font-family:"Calibri",sans-serif;color:black'><span style='text-decoration:
 none'>&nbsp;</span></span></u></p>

<div align=right>

<table class=3 dir=rtl border=1 cellspacing=0 cellpadding=0 width=549
 style='margin-left:34.8pt;border-collapse:collapse;border:none'>
 <tr style='height:18.3pt'>
  <td width=111 valign=top style='width:82.95pt;border:solid black 1.0pt;
  background:#D9D9D9;padding:0in 5.4pt 0in 5.4pt;height:18.3pt'>
  <p class=MsoNormal align=center dir=RTL style='margin-right:0in;text-align:
  center;text-indent:-.1pt;line-height:normal;border:none'><span lang=HE
  style='font-family:"Calibri",sans-serif;color:black'>תאריך פתיחה התלונה</span></p>
  </td>
  <td width=110 valign=top style='width:82.5pt;border:solid black 1.0pt;
  border-right:none;background:#D9D9D9;padding:0in 5.4pt 0in 5.4pt;height:18.3pt'>
  <p class=MsoNormal align=center dir=RTL style='margin-right:0in;text-align:
  center;text-indent:-.1pt;line-height:normal;border:none'><span lang=HE
  style='font-family:"Calibri",sans-serif;color:black'>תאריך משוב התלונה</span></p>
  </td>
  <td width=109 valign=top style='width:81.6pt;border:solid black 1.0pt;
  border-right:none;background:#D9D9D9;padding:0in 5.4pt 0in 5.4pt;height:18.3pt'>
  <p class=MsoNormal align=center dir=RTL style='margin-right:0in;text-align:
  center;text-indent:-.1pt;line-height:normal;border:none'><span lang=HE
  style='font-family:"Calibri",sans-serif;color:black'>שם הלקוח</span></p>
  </td>
  <td width=110 valign=top style='width:82.45pt;border:solid black 1.0pt;
  border-right:none;background:#D9D9D9;padding:0in 5.4pt 0in 5.4pt;height:18.3pt'>
  <p class=MsoNormal align=center dir=RTL style='margin-right:0in;text-align:
  center;text-indent:0in;line-height:normal;border:none'><span lang=HE
  style='font-family:"Calibri",sans-serif;color:black'>יחידה- גף</span></p>
  </td>
  <td width=110 valign=top style='width:82.15pt;border:solid black 1.0pt;
  border-right:none;background:#D9D9D9;padding:0in 5.4pt 0in 5.4pt;height:18.3pt'>
  <p class=MsoNormal align=center dir=RTL style='margin-right:0in;text-align:
  center;text-indent:-.1pt;line-height:normal;border:none'><span lang=HE
  style='font-family:"Calibri",sans-serif;color:black'>שם המשיב ותפקיד</span></p>
  </td>
 </tr>
 <tr style='height:29.0pt'>
  <td width=111 valign=top style='width:82.95pt;border:solid black 1.0pt;
  border-top:none;padding:0in 5.4pt 0in 5.4pt;height:29.0pt'>
  <p class=MsoNormal align=center dir=RTL style='margin-right:0in;text-align:
  center;text-indent:-.1pt;line-height:normal;border:none'><span dir=LTR
  style='font-family:"Calibri",sans-serif;color:black'>${openingDate}</span></p>
  </td>
  <td width=110 valign=top style='width:82.5pt;border-top:none;border-left:
  solid black 1.0pt;border-bottom:solid black 1.0pt;border-right:none;
  padding:0in 5.4pt 0in 5.4pt;height:29.0pt'>
  <p class=MsoNormal align=center dir=RTL style='margin-top:9.0pt;margin-right:
  0in;margin-bottom:.25in;margin-left:0in;text-align:center;text-indent:-.1pt;
  line-height:normal;background:white'><span dir=LTR style='font-family:"Calibri",sans-serif;
  color:#202124'>${feedbackDate}</span></p>
  </td>
  <td width=109 valign=top style='width:81.6pt;border-top:none;border-left:
  solid black 1.0pt;border-bottom:solid black 1.0pt;border-right:none;
  padding:0in 5.4pt 0in 5.4pt;height:29.0pt'>
  <p class=MsoNormal dir=RTL style='margin-right:0in;text-align:justify;
  text-indent:0in;line-height:normal'><span dir=LTR style='font-family:"Calibri",sans-serif'>${customerName}</span></p>
  </td>
  <td width=110 valign=top style='width:82.45pt;border-top:none;border-left:
  solid black 1.0pt;border-bottom:solid black 1.0pt;border-right:none;
  padding:0in 5.4pt 0in 5.4pt;height:29.0pt'>
  <p class=MsoNormal align=center dir=RTL style='margin-right:0in;text-align:
  center;text-indent:-.1pt;line-height:normal;border:none'><span dir=LTR
  style='font-family:"Calibri",sans-serif;color:black'>${unit}</span></p>
  </td>
  <td width=110 valign=top style='width:82.15pt;border-top:none;border-left:
  solid black 1.0pt;border-bottom:solid black 1.0pt;border-right:none;
  padding:0in 5.4pt 0in 5.4pt;height:29.0pt'>
  <p class=MsoNormal align=center dir=RTL style='margin-right:0in;text-align:
  center;text-indent:-.1pt;line-height:normal;border:none'><span dir=LTR
  style='font-family:"Calibri",sans-serif;color:black'>${responderName}</span></p>
  </td>
 </tr>
</table>

</div>

<p class=MsoNormal align=left dir=RTL style='margin-right:0in;text-align:right;
text-indent:-.1pt;line-height:150%;border:none'><span dir=LTR style='font-family:
"Calibri",sans-serif;color:black'>&nbsp;</span></p>

<p class=MsoNormal align=left dir=RTL style='margin-right:0in;text-align:right;
text-indent:-.1pt;line-height:150%;border:none'><u><span lang=HE
style='font-family:"Calibri",sans-serif;color:black'>פרוט התלונה: </span></u></p>

<p class=MsoNormal align=left dir=RTL style='margin-right:0in;text-align:right;
text-indent:-.1pt;line-height:150%;border:none'><span dir=RTL><span lang=HE style='font-family:"Calibri",sans-serif'>${complaintDetailsHtml}</span></span></p>

<p class=MsoNormal align=left dir=RTL style='margin-right:0in;text-align:right;
text-indent:-.1pt;line-height:150%;border:none'><b><u><span dir=LTR
style='font-family:"Calibri",sans-serif'><span style='text-decoration:none'>&nbsp;</span></span></u></b></p>

<p class=MsoNormal align=left dir=RTL style='margin-right:0in;text-align:right;
text-indent:-.1pt;line-height:150%;border:none'><u><span lang=HE
style='font-family:"Calibri",sans-serif;color:black'>התייחסות:</span></u></p>

<p class=MsoNormal align=left dir=RTL style='margin-right:0in;text-align:right;
text-indent:-.1pt;line-height:150%;border:none'><span dir=RTL><span lang=HE style='font-family:"Calibri",sans-serif'>${responseHtml}</span></span></p>

<p class=MsoNormal align=left dir=RTL style='margin-right:0in;text-align:right;
text-indent:0in;line-height:150%;border:none'><span lang=HE
style='font-family:"Calibri",sans-serif;color:black'>                                                                                                                                         
בברכה,</span></p>

<p class=MsoNormal align=left dir=RTL style='margin-right:-.05pt;text-align:
right;text-indent:0in;line-height:150%;border:none'><span lang=HE
style='font-family:"Calibri",sans-serif;color:black'>                                                                                                                              
${responderName}</span></p>

<p class=MsoNormal align=left dir=RTL style='margin-right:-.05pt;text-align:
right;text-indent:0in;line-height:150%;border:none'><span lang=HE
style='font-family:"Calibri",sans-serif;color:black'>                                                                                                      
                  מנהל (או תפקיד)</span></p>

</div>

</body>

</html>`.trim();

    // Generate blob as MS Word HTML (.doc)
    const blob = new Blob([template], { type: "application/msword;charset=utf-8" });

    const fileNameDate = new Date().toLocaleDateString("he-IL").replace(/\//g, "-");
    const fileName = `complaint_${escapeHtml(complaint.id)}_${fileNameDate}.doc`;

    // Trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "הדוח הורד בהצלחה",
      description: `הקובץ ${fileName} נשמר במחשב שלך`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted rtl">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="hebrew-title text-primary">פרטי פנייה #{complaint.id}</h1>
                <p className="text-sm text-muted-foreground">מערכת ניהול פניות</p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => navigate("/complaints")}
              className="flex items-center gap-2 rounded-xl"
            >
              <ArrowRight className="w-4 h-4" />
              חזרה לרשימה
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Complaint Header */}
            <Card className="card-elegant">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="hebrew-title text-xl mb-3">
                      {complaint.title}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {complaint.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {complaint.submitter}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Complaint Description */}
            <Card className="card-elegant">
              <CardHeader>
                <CardTitle className="hebrew-subtitle flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  תיאור הפנייה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="hebrew-body leading-relaxed text-foreground whitespace-pre-wrap">
                  {complaint.description}
                </p>
              </CardContent>
            </Card>

            {/* Response Form (email to submitter) */}
            <Card className="card-elegant">
              <CardHeader>
                <CardTitle className="hebrew-subtitle flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  תגובה לפנייה
                </CardTitle>
                <CardDescription>
                  שלחו תגובה למגיש הפנייה באימייל
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="response" className="hebrew-body">
                    תוכן התגובה
                  </Label>
                  <Textarea
                    id="response"
                    placeholder="כתבו כאן את התגובה שלכם לפנייה..."
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    className="mt-2 min-h-32 resize-none hebrew-body"
                    dir="rtl"
                  />
                </div>
                <Button
                  onClick={() => {
                    if (!response.trim()) {
                      toast({ title: "שגיאה", description: "אנא כתבו תגובה לפני השליחה", variant: "destructive" });
                      return;
                    }
                    setIsSending(true);
                    setTimeout(() => {
                      toast({
                        title: "התגובה נשלחה",
                        description: `התגובה נשלחה לכתובת ${complaint.submitterEmail || "(לא סופק אימייל)"}`,
                      });
                      setResponse("");
                      setIsSending(false);
                    }, 1000);
                  }}
                  disabled={isSending || !response.trim()}
                  className="w-full bg-gradient-to-l from-primary to-primary-glow hover:shadow-lg transition-all rounded-xl"
                >
                  <Send className="w-4 h-4 ml-2" />
                  {isSending ? "שולח תגובה..." : "שלח תגובה"}
                </Button>
                {complaint.submitterEmail && (
                  <p className="text-xs text-muted-foreground text-center" dir="ltr">
                    {complaint.submitterEmail}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Submitter Details */}
            <Card className="card-elegant">
              <CardHeader>
                <CardTitle className="hebrew-subtitle">פרטי המגיש</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">שם: </span>
                  <span className="font-medium">{complaint.submitter}</span>
                </div>
                {complaint.submitterEmail && (
                  <div>
                    <span className="text-muted-foreground">אימייל: </span>
                    <span className="font-medium">{complaint.submitterEmail}</span>
                  </div>
                )}
                {complaint.submitterPhone && (
                  <div>
                    <span className="text-muted-foreground">טלפון: </span>
                    <span className="font-medium">{complaint.submitterPhone}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">קטגוריה: </span>
                  <span className="font-medium">{complaint.category}</span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="card-elegant">
              <CardHeader>
                <CardTitle className="hebrew-subtitle">פעולות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleDownloadComplaint}
                  variant="outline"
                  className="w-full justify-start rounded-xl"
                >
                  <Download className="w-4 h-4 ml-2" />
                  הורד דוח מלא
                </Button>

                <Button
                  onClick={handleFinishComplaint}
                  disabled={isFinishing}
                  className="w-full justify-start rounded-xl bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="w-4 h-4 ml-2" />
                  {isFinishing ? "מסיים..." : "סיים פנייה"}
                </Button>

                <Separator />

                <Button
                  onClick={handleDeleteComplaint}
                  disabled={isDeleting}
                  variant="destructive"
                  className="w-full justify-start rounded-xl"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  {isDeleting ? "מוחק..." : "מחק לצמיתות"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ComplaintDetail;
