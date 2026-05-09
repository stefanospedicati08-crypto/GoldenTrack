import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow scheduled automations (no user auth) via service role
  const activePlans = await base44.asServiceRole.entities.WorkoutPlan.filter({ status: "active" });

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const cutoff = twoDaysAgo.toISOString().split("T")[0];

  let notified = 0;

  for (const plan of activePlans) {
    const userEmail = plan.assigned_to;
    if (!userEmail) continue;

    // Check if user logged anything in last 2 days
    const recentLogs = await base44.asServiceRole.entities.WorkoutLog.filter({
      plan_id: plan.id,
      created_by: userEmail,
    }, "-date", 1);

    const hasRecentLog = recentLogs.length > 0 && recentLogs[0].date >= cutoff;
    if (hasRecentLog) continue;

    // Avoid duplicate notifications: check if we already sent one today
    const today = new Date().toISOString().split("T")[0];
    const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
      user_email: userEmail,
      read: false,
    }, "-created_date", 10);

    const alreadySent = existingNotifs.some(n =>
      n.message.includes("allenamento") &&
      n.created_date?.startsWith(today)
    );
    if (alreadySent) continue;

    await base44.asServiceRole.entities.Notification.create({
      user_email: userEmail,
      message: "💪 Sono passati più di 2 giorni dall'ultimo allenamento registrato. Ricordati di segnare la tua sessione nella scheda attiva!",
      read: false,
    });
    notified++;
  }

  return Response.json({ ok: true, notified });
});