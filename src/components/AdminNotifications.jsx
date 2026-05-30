import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Send, Loader2, CheckSquare, Square } from "lucide-react";
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
    setSelectedUsers(
      selectedUsers.length === regularUsers.length ? [] : regularUsers.map(u => u.email)
    );
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
      className="bg-white/5 border border-white/8 rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#fcd12a]/12 flex items-center justify-center">
          <Bell className="w-5 h-5 text-[#fcd12a]" />
        </div>
        <div>
          <h2 className="font-heading font-semibold text-base text-white">Invia Notifica</h2>
          <p className="text-xs text-white/40 mt-0.5">Invia messaggi ai clienti</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-white">Destinatari</p>
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 text-xs text-[#fcd12a]/80 hover:text-[#fcd12a] font-medium transition-colors"
          >
            {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {allSelected ? "Deseleziona tutti" : "Seleziona tutti"}
          </button>
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1 border border-white/8 rounded-2xl p-2 bg-white/3">
          {regularUsers.length === 0 ? (
            <p className="text-sm text-white/35 text-center py-4">Nessun cliente registrato</p>
          ) : (
            regularUsers.map(u => (
              <label
                key={u.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(u.email)}
                  onChange={() => toggleUser(u.email)}
                  className="w-4 h-4 accent-[#fcd12a]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{u.full_name || u.email}</p>
                  <p className="text-xs text-white/35 truncate">{u.email}</p>
                </div>
              </label>
            ))
          )}
        </div>
        {selectedUsers.length > 0 && (
          <p className="text-xs text-[#fcd12a]/80 font-medium">{selectedUsers.length} selezionato/i</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-white/35 uppercase tracking-wider block">Messaggio *</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          placeholder="Scrivi il messaggio da inviare..."
          className="w-full text-sm bg-white/5 border border-white/10 rounded-2xl px-4 py-3 resize-none focus:outline-none focus:border-[#fcd12a]/30 text-white placeholder:text-white/20"
        />
      </div>

      <button
        onClick={handleSend}
        disabled={sending || !message.trim() || selectedUsers.length === 0}
        className="flex items-center justify-center gap-2 h-11 px-6 rounded-2xl bg-[#fcd12a] text-black font-bold text-sm hover:bg-[#fcd12a]/90 disabled:opacity-40 transition-all"
      >
        {sending ? <><Loader2 className="w-4 h-4 animate-spin" />Invio...</> : <><Send className="w-4 h-4" />Invia a {selectedUsers.length || 0} utente/i</>}
      </button>
    </motion.div>
  );
}