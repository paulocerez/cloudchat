import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Upload, Download, HardDrive, LogOut, User } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname === '/send') return 'transfer';
    if (location.pathname === '/storage') return 'storage';
    if (location.pathname === '/download') return 'download';
    return 'transfer';
  });

  if (location.pathname === '/') {
    return null;
  }

           const tabs = [
           {
             id: 'transfer',
             label: 'Send files',
             icon: Upload,
             path: '/send'
           },
           {
             id: 'storage',
             label: 'Storage',
             icon: HardDrive,
             path: '/storage'
           },
           {
             id: 'download',
             label: 'Download',
             icon: Download,
             path: '/download'
           }
         ];

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const selectedTab = tabs.find(tab => tab.id === value);
    if (selectedTab) {
      navigate(selectedTab.path);
    }
  };

  return (
    <nav className="bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between h-16">
                           <div className="flex items-center">
                   <Link to="/send" className="flex items-center space-x-3">
                     <Logo size="md" />
                   </Link>
                 </div>
          
                           {/* Navigation Selector */}
                 <div className="flex items-center space-x-4">
                     <Select value={activeTab} onValueChange={handleTabChange}>
                       <SelectTrigger className="w-48">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         {tabs.map((tab) => {
                           const Icon = tab.icon;
                           return (
                             <SelectItem key={tab.id} value={tab.id}>
                               <div className="flex items-center space-x-2">
                                 <Icon className="h-4 w-4" />
                                 <span>{tab.label}</span>
                               </div>
                             </SelectItem>
                           );
                         })}
                       </SelectContent>
                     </Select>
                 </div>
        </div>
      </div>
    </nav>
  );
} 