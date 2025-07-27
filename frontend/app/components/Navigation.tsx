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

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname === '/send') return 'transfer';
    if (location.pathname === '/storage') return 'storage';
    if (location.pathname === '/download') return 'download';
    return 'transfer';
  });

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
                   <Link to="/send" className="flex items-center space-x-3 text-xl font-bold text-gray-900">
                     <span>CloudChat</span>
                   </Link>
                 </div>
          
                           {/* Navigation Selector */}
                 <div className="flex items-center space-x-4">
                   {isAuthenticated && (
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
                   )}

                   {/* User Menu */}
                   {isAuthenticated && user && (
                     <div className="flex items-center space-x-3">
                       <div className="flex items-center space-x-2 text-sm text-gray-700">
                         <User className="h-4 w-4" />
                         <span>{user.name || user.email}</span>
                       </div>
                       <button
                         onClick={logout}
                         className="text-gray-600 hover:text-gray-900 transition-colors p-2"
                         title="Sign out"
                       >
                         <LogOut className="h-4 w-4" />
                       </button>
                     </div>
                   )}

                   {/* Login Link for unauthenticated users */}
                   {!isAuthenticated && (
                     <Link 
                       to="/login" 
                       className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm"
                     >
                       Sign In
                     </Link>
                   )}
                 </div>
        </div>
      </div>
    </nav>
  );
} 