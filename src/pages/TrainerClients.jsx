import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Search, Plus, Check, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function TrainerClients() {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [myClients, setMyClients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("my");
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const u = await base44.auth.me();
      setUser(u);
      const [users, clients] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.TrainerClient.filter({ trainer_email: u.email }),
      ]);
      setAllUsers(users.filter(us => us.email !== u.email && us.role !== "admin" && us.role !== "trainer"));
      setMyClients(clients);
      setLoading(false);
    }
    load();
  }, []);

  async function handleAddClient(targetUser) {
    const exists = myClients.find(c => c.client_email === targetUser.email);
    if (exists) return;
    const record = await base44.entities.TrainerClient.create({
      trainer_email: user.email,
      client_email: targetUser.email,
      client_name: targetUser.full_name || targetUser.email,
    });
    setMyClients(prev => [...prev, record]);
    toast.success(`${targetUser.full_name || targetUser.email} aggiunto ai tuoi clienti`);
  }

  async function handleRemoveClient(record) {
    await base44.entities.TrainerClient.delete(record.id);
    setMyClients(prev => prev.filter(c => c.id !== record.id));
    toast.success("Cliente rimosso");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-[#fcd12a]/20 border-t-[#fcd12a] rounded-full animate-spin" />
    </div>
  );

  const myClientEmails = new Set(myClients.map(c => c.client_email));
  const myClientUsers = allUsers.filter(u => myClientEmails.has(u.email));
  const filteredAll = allUsers.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  const filteredMy = myClientUsers.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  const displayList = tab === "my" ? filteredMy : filteredAll;

  return (
    <div className="space-y-5 pb-10">
      <div className="pt-1">
        <h1 className="font-heading text-2xl font-bold text-white">I Miei Clienti</h1>
        <p className="text-white/35 text-sm mt-0.5">Gestisci i tuoi clienti e visualizza i loro dati</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 border border-white/8 rounded-2xl p-1">
        <button
          onClick={() => setTab("my")}
          className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            tab === "my" ? "bg-[#fcd12a] text-black font-bold" : "text-white/50 hover:text-white"
          }`}
        >
          I miei ({myClients.length})
        </button>
        <button
          onClick={() => setTab("all")}
          className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            tab === "all" ? "bg-[#fcd12a] text-black font-bold" : "text-white/50 hover:text-white"
          }`}
        >
          Tutti ({allUsers.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input
          placeholder="Cerca cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 h-11 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/30"
        />
      </div>

      {/* List */}
      {displayList.length === 0 ? (
        <div className="bg-white/4 border border-white/8 rounded-2xl p-10 text-center">
          <Users className="w-12 h-12 text-white/15 mx-auto mb-3" />
          <p className="text-white/35 text-sm">{tab === "my" ? "Nessun cliente assegnato. Vai su 'Tutti' per aggiungerne." : "Nessun utente trovato."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayList.map((u, i) => {
            const isMyClient = myClientEmails.has(u.email);
            const clientRecord = myClients.find(c => c.client_email === u.email);
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-2xl p-4"
              >
                <div className="w-10 h-10 rounded-full bg-[#fcd12a]/15 flex items-center justify-center text-sm font-bold text-[#fcd12a] shrink-0">
                  {u.full_name?.[0] || u.email?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{u.full_name || "—"}</p>
                  <p className="text-sm text-white/40 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isMyClient && (
                    <button
                      onClick={() => navigate(`/cliente/${encodeURIComponent(u.email)}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#fcd12a]/12 text-[#fcd12a] text-xs font-medium hover:bg-[#fcd12a]/20 transition-colors"
                    >
                      Dati <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isMyClient ? (
                    <button
                      onClick={() => handleRemoveClient(clientRecord)}
                      className="w-8 h-8 rounded-xl bg-green-400/10 flex items-center justify-center text-green-400 hover:bg-green-400/20 transition-colors"
                      title="Rimuovi dal gruppo"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAddClient(u)}
                      className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center text-white/40 hover:bg-[#fcd12a]/12 hover:text-[#fcd12a] transition-colors"
                      title="Aggiungi ai tuoi clienti"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}