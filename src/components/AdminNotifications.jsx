import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Bell, Send, Users, Loader2, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AdminNotifications({ users }) {
  const [message, setMessage] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sending, setSending] = useState(false);

  const regularUsers = users.filter(u => u.role !== "admin");

  function toggleUser(email) {
    setSelectedUsers(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  }

  function selectAll() {
    if (selectedUsers.length === regularUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(regularUsers.map(u => u.email));
    }
  }

  async function handleSend() {
    if (!message.trim() || selectedUsers.length === 0) {
      toast.error("Seleziona almeno un utente e scrivi un messaggio");
      return;
    }
    setSending(true);
    await Promise.all(
      selectedUsers.map(email =>
        base44.entities.Notification.create({ user_email: email, message: message.trim(), read: false })
      )
    );
    toast.success(`Notifica inviata a ${selectedUsers.length} utente/i!`);
    setMessage("");
    setSelectedUsers([]);
    setSending(false);
  }

  const allSelected = regularUsers.length > 0 && selectedUsers.length === regularUsers.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-6 space-y-5"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-heading font-semibold text-lg">Invia Notifica</h2>
          <p className="text-sm text-muted-foreground">Invia messaggi ai clienti</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Destinatari</p>
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {allSelected ? "Deseleziona tutti" : "Seleziona tutti"}
          </button>
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-xl p-2">
          {regularUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nessun cliente registrato</p>
          ) : (
            regularUsers.map(u => (
              <label
                key={u.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(u.email)}
                  onChange={() => toggleUser(u.email)}
                  className="w-4 h-4 accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
              </label>
            ))
          )}
        </div>
        {selectedUsers.length > 0 && (
          <p className="text-xs text-primary font-medium">{selectedUsers.length} selezionato/i</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium block">Messaggio *</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          placeholder="Scrivi il messaggio da inviare..."
          className="w-full text-sm bg-background border border-input rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
        />
      </div>

      <Button onClick={handleSend} disabled={sending || !message.trim() || selectedUsers.length === 0} className="h-10 rounded-xl px-6 gap-2">
        {sending ? <><Loader2 className="w-4 h-4 animate-spin" />Invio...</> : <><Send className="w-4 h-4" />Invia a {selectedUsers.length || 0} utente/i</>}
      </Button>
    </motion.div>
  );
}