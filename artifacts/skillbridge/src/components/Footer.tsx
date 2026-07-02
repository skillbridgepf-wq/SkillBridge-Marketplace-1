import Link from 'next/link';
import { Briefcase } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg gradient-card flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Skill<span className="text-brand-400">Bridge</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              Connecting talented professionals with exciting opportunities worldwide.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">For Clients</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/projects/new" className="hover:text-white transition-colors">Post a Project</Link></li>
              <li><Link href="/projects" className="hover:text-white transition-colors">Browse Talent</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">My Projects</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">For Freelancers</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/projects" className="hover:text-white transition-colors">Find Work</Link></li>
              <li><Link href="/profile" className="hover:text-white transition-colors">Build Profile</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">My Proposals</Link></li>
              <li><Link href="/contracts" className="hover:text-white transition-colors">My Contracts</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="#" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Support</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm" suppressHydrationWarning>
            © {new Date().getFullYear()} SkillBridge. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
