'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import type { Profile, ProfileInsert } from '@/types/database';
import { User, Plus, X, Save, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [skillInput, setSkillInput] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    bio: '',
    location: '',
    hourly_rate: '',
    website: '',
    is_freelancer: true,
    is_client: false,
    skills: [] as string[],
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const p = data as Profile;
          setProfile(p);
          setForm({
            full_name: p.full_name || '',
            bio: p.bio || '',
            location: p.location || '',
            hourly_rate: p.hourly_rate?.toString() || '',
            website: p.website || '',
            is_freelancer: p.is_freelancer ?? true,
            is_client: p.is_client ?? false,
            skills: p.skills || [],
          });
        }
        setLoading(false);
      });
  }, [user]);

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !form.skills.includes(trimmed)) {
      setForm((f) => ({ ...f, skills: [...f.skills, trimmed] }));
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess('');

    const payload: ProfileInsert = {
      id: user.id,
      full_name: form.full_name || null,
      bio: form.bio || null,
      location: form.location || null,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
      website: form.website || null,
      is_freelancer: form.is_freelancer,
      is_client: form.is_client,
      skills: form.skills,
    };

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' });

    if (upsertError) {
      setError(upsertError.message);
    } else {
      setSuccess('Profile saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    }
    setSaving(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">My Profile</h1>
          <p className="text-slate-500">Update your profile so clients and freelancers can learn about you.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              {success}
            </div>
          )}

          {/* Avatar + Name */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
              <User className="w-5 h-5 text-brand-600" />
              Basic Information
            </h2>

            <div className="flex items-center gap-5 mb-5">
              <div className="w-16 h-16 rounded-2xl gradient-card flex items-center justify-center text-white font-bold text-2xl shrink-0">
                {(form.full_name || displayName)[0]?.toUpperCase() || '?'}
              </div>
              <div className="text-sm text-slate-500">
                <p className="font-medium text-slate-700 mb-1">{user?.email}</p>
                <p>Your avatar is synced from your authentication provider.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm input-focus"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="City, Country"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm input-focus"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bio</label>
                <textarea
                  rows={4}
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Tell others about yourself, your experience, and what you're passionate about..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm input-focus resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Website</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm input-focus"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hourly Rate ($)</label>
                <input
                  type="number"
                  min="0"
                  value={form.hourly_rate}
                  onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))}
                  placeholder="e.g. 75"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm input-focus"
                />
              </div>
            </div>
          </div>

          {/* Role */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">I am a…</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${form.is_freelancer ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input
                  type="checkbox"
                  checked={form.is_freelancer}
                  onChange={(e) => setForm((f) => ({ ...f, is_freelancer: e.target.checked }))}
                  className="text-brand-600"
                />
                <div>
                  <p className={`font-semibold text-sm ${form.is_freelancer ? 'text-brand-700' : 'text-slate-800'}`}>Freelancer</p>
                  <p className="text-xs text-slate-500">I offer services</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${form.is_client ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input
                  type="checkbox"
                  checked={form.is_client}
                  onChange={(e) => setForm((f) => ({ ...f, is_client: e.target.checked }))}
                  className="text-brand-600"
                />
                <div>
                  <p className={`font-semibold text-sm ${form.is_client ? 'text-brand-700' : 'text-slate-800'}`}>Client</p>
                  <p className="text-xs text-slate-500">I hire freelancers</p>
                </div>
              </label>
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Skills</h2>
            <div className="flex gap-2 flex-wrap mb-3">
              {form.skills.map((skill) => (
                <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-sm font-medium">
                  {skill}
                  <button type="button" onClick={() => removeSkill(skill)}><X className="w-3.5 h-3.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(skillInput); }
                }}
                placeholder="Add a skill (press Enter)"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm input-focus"
              />
              <button type="button" onClick={() => addSkill(skillInput)} className="px-4 py-2.5 border border-slate-300 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-8 py-4 gradient-card text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Profile
          </button>
        </form>
      </main>

      <Footer />
    </div>
  );
}
