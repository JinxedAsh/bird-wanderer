/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { auth, type AuthUser } from './lib/auth';
import { loadDiscovery, type DiscoveryCatalogue } from './lib/discovery';
import {
  ScreenType,
  BirdSpecies,
  Hotspot,
  CommunityPost,
  JournalEntry,
  AppNotification,
  UserProfile,
} from './types';
import {
  INITIAL_USER_PROFILE,
  SPECIES_DATABASE,
  COMMUNITY_POSTS,
  HOTSPOTS_DATA,
  JOURNAL_ENTRIES,
  APP_NOTIFICATIONS,
} from './data/mockData';

import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ExploreScreen } from './components/ExploreScreen';
import { CommunityScreen } from './components/CommunityScreen';
import { HotspotsScreen } from './components/HotspotsScreen';
import { JournalScreen } from './components/JournalScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SpeciesDetailScreen } from './components/SpeciesDetailScreen';
import { LogObservationScreen } from './components/LogObservationScreen';
import { HotspotDetailScreen } from './components/HotspotDetailScreen';
import { LifeListScreen } from './components/LifeListScreen';
import { BirdQuizScreen } from './components/BirdQuizScreen';
import { FieldChatScreen } from './components/FieldChatScreen';
import { GlobalSearchScreen } from './components/GlobalSearchScreen';
import { NotificationsScreen } from './components/NotificationsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AuthScreen } from './components/AuthScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('auth');
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [navigationHistory, setNavigationHistory] = useState<ScreenType[]>(['explore']);

  // Data states
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [speciesList, setSpeciesList] = useState<BirdSpecies[]>(SPECIES_DATABASE);
  const [hotspotsList, setHotspotsList] = useState<Hotspot[]>(HOTSPOTS_DATA);
  const [posts, setPosts] = useState<CommunityPost[]>(COMMUNITY_POSTS);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(JOURNAL_ENTRIES);
  const [notifications, setNotifications] = useState<AppNotification[]>(APP_NOTIFICATIONS);
  const [discovery, setDiscovery] = useState<DiscoveryCatalogue | null>(null);
  const [discoveryError, setDiscoveryError] = useState('');
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryAttempt, setDiscoveryAttempt] = useState(0);

  useEffect(() => {
    setDiscovery(null);
    setDiscoveryError('');
    if (!sessionUser) { setDiscoveryLoading(false); return; }
    const controller = new AbortController();
    setDiscoveryLoading(true);
    loadDiscovery(controller.signal).then((data) => {
      if (!controller.signal.aborted) setDiscovery(data);
    }).catch((error) => {
      if (!controller.signal.aborted) setDiscoveryError(error.message || 'Discovery is unavailable.');
    }).finally(() => {
      if (!controller.signal.aborted) setDiscoveryLoading(false);
    });
    return () => controller.abort();
  }, [sessionUser?.id, discoveryAttempt]);

  const acceptSession = (user: AuthUser) => {
    setSessionUser(user);
    setUserProfile({ ...INITIAL_USER_PROFILE, name: user.name, handle: `@${user.name.toLowerCase().replace(/\s+/g, '')}` });
    setPosts(COMMUNITY_POSTS);
    setJournalEntries(JOURNAL_ENTRIES);
    setNotifications(APP_NOTIFICATIONS);
    setSpeciesList(SPECIES_DATABASE);
    setHotspotsList(HOTSPOTS_DATA);
    setNavigationHistory(['explore']);
    setCurrentScreen('explore');
  };

  useEffect(() => {
    let active = true;
    auth.me().then((user) => {
      if (active && user) acceptSession(user);
    }).catch((error) => {
      if (active) setSessionError(error.message);
    }).finally(() => {
      if (active) setCheckingSession(false);
    });
    return () => { active = false; };
  }, []);

  // Selected item states
  const [selectedSpecies, setSelectedSpecies] = useState<BirdSpecies>(SPECIES_DATABASE[1]); // Common Kingfisher by default
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot>(HOTSPOTS_DATA[1]); // Okhla Sanctuary

  // Global Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(message);
    toastTimer.current = setTimeout(() => {
      setToastMessage(null);
      toastTimer.current = null;
    }, 2600);
  };

  const navigateTo = (screen: ScreenType) => {
    if (!sessionUser && screen !== 'auth') return;
    if (screen === currentScreen) return;
    setNavigationHistory((prev) => [...prev, screen]);
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBack = () => {
    if (navigationHistory.length > 1) {
      const nextHistory = [...navigationHistory];
      nextHistory.pop(); // Remove current screen
      const prevScreen = nextHistory[nextHistory.length - 1];
      setNavigationHistory(nextHistory);
      setCurrentScreen(prevScreen);
    } else {
      setCurrentScreen('explore');
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Quick navigation handlers
  const handleSelectSpecies = (species: BirdSpecies) => {
    setSelectedSpecies(species);
    navigateTo('species-detail');
  };

  const handleSelectSpeciesByName = (name: string) => {
    const found = discovery?.species.find((s) => s.name.toLowerCase() === name.toLowerCase()) || speciesList.find((s) => s.name.toLowerCase().includes(name.toLowerCase()));
    if (found) {
      setSelectedSpecies(found);
      navigateTo('species-detail');
    } else {
      showToast('This species is not available in the sample catalogue yet.');
    }
  };

  const handleSelectSpeciesById = (speciesId: string) => {
    const found = speciesList.find((s) => s.id === speciesId);
    if (found) {
      setSelectedSpecies(found);
      navigateTo('species-detail');
    } else {
      showToast('This species is not available in the sample catalogue yet.');
    }
  };

  const handleSelectHotspot = (hotspot: Hotspot) => {
    setSelectedHotspot(hotspot);
    navigateTo('hotspot-detail');
  };

  const handleQuickLog = (species: BirdSpecies) => {
    setSelectedSpecies(species);
    navigateTo('log-observation');
  };

  // Interactions
  const handleToggleLike = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    showToast(post.isLiked ? 'Unliked sighting' : 'Liked sighting');
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isLiked = !p.isLiked;
          return {
            ...p,
            isLiked,
            likes: isLiked ? p.likes + 1 : p.likes - 1,
          };
        }
        return p;
      })
    );
  };

  const handleToggleSavePost = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    showToast(post.isSaved ? 'Removed from bookmarks' : 'Saved to field bookmarks');
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isSaved = !p.isSaved;
          return { ...p, isSaved };
        }
        return p;
      })
    );
  };

  const handleToggleSaveHotspot = (hotspotId: string) => {
    const hotspot = discovery?.hotspots.find((h) => h.id === hotspotId) || hotspotsList.find((h) => h.id === hotspotId);
    if (!hotspot) return;
    setDiscovery((prev) => prev ? { ...prev, hotspots: prev.hotspots.map((h) => h.id === hotspotId ? { ...h, isSaved: !h.isSaved } : h) } : prev);
    setHotspotsList((prev) => prev.map((h) =>
      h.id === hotspotId ? { ...h, isSaved: !h.isSaved } : h
    ));
    showToast(hotspot.isSaved ? 'Removed from bookmarks' : `Saved ${hotspot.name} to field bookmarks`);
  };

  const handleAddComment = (postId: string, text: string) => {
    const commentText = text.trim();
    if (!commentText || !posts.some((p) => p.id === postId)) return;
    const newComment = {
      id: crypto.randomUUID(),
      author: userProfile.name,
      avatarInitials: userProfile.name.slice(0, 2).toUpperCase(),
      time: 'Just now',
      text: commentText,
      color: 'bg-[#2d5a27] text-white',
    };
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            commentsCount: p.commentsCount + 1,
            comments: [...(p.comments || []), newComment],
          };
        }
        return p;
      })
    );
  };

  const handleToggleJournalLifeList = (entryId: string) => {
    setJournalEntries((prev) =>
      prev.map((e) => {
        if (e.id === entryId) {
          return { ...e, inLifeList: !e.inLifeList };
        }
        return e;
      })
    );
  };

  const handleDeleteJournalEntry = (entryId: string) => {
    setJournalEntries((prev) => prev.filter((e) => e.id !== entryId));
  };

  const handlePostObservation = (newPost: CommunityPost, newEntry: JournalEntry) => {
    setPosts((prev) => [newPost, ...prev]);
    setJournalEntries((prev) => [newEntry, ...prev]);
    setUserProfile((prev) => ({
      ...prev,
      photosCount: prev.photosCount + 1,
    }));
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
    showToast('All field alerts marked as read');
  };

  const handleSelectNotification = (notif: AppNotification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isUnread: false } : n))
    );
    if (notif.category === 'mentions' && notif.title.includes('Maya')) {
      navigateTo('community');
    } else if (notif.title.includes('Nisha')) {
      navigateTo('messages');
    } else {
      navigateTo('species-detail');
    }
  };

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...updated }));
  };

  const isMainTab = ['explore', 'community', 'hotspots', 'journal', 'profile'].includes(
    currentScreen
  );

  const unreadNotifsCount = notifications.filter((n) => n.isUnread).length;

  const handleLogout = async () => {
    try {
      await auth.logout();
      setSessionUser(null);
      setUserProfile(INITIAL_USER_PROFILE);
      setPosts(COMMUNITY_POSTS);
      setJournalEntries(JOURNAL_ENTRIES);
      setNotifications(APP_NOTIFICATIONS);
      setNavigationHistory(['auth']);
      setCurrentScreen('auth');
      setToastMessage(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not sign out. Please try again.');
    }
  };

  if (checkingSession || sessionError) return (
    <main className="min-h-screen bg-[#f7f9ff] flex items-center justify-center p-6 text-center">
      <div role="status">
        <p>{sessionError || 'Opening your field log…'}</p>
        {sessionError && <button className="mt-4 rounded-xl bg-[#2d5a27] px-5 py-3 text-white" onClick={() => window.location.reload()}>Try again</button>}
      </div>
    </main>
  );

  return (
    <div className="min-h-full bg-[#f7f9ff] text-[#181c20] flex flex-col items-center">
      {/* Mobile Frame Container */}
      <div className="w-full max-w-md min-h-screen bg-[#f7f9ff] shadow-sm relative flex flex-col">
        {/* Header (shown on all screens except 'auth') */}
        {currentScreen !== 'auth' && (
          <Header
            currentScreen={currentScreen}
            onNavigate={navigateTo}
            onBack={handleBack}
            unreadCount={unreadNotifsCount}
            userProfile={userProfile}
            showToast={showToast}
          />
        )}

        {/* Main Content Area */}
        <main
          className={`flex-1 flex flex-col relative w-full ${
            currentScreen !== 'auth' ? 'pt-16' : ''
          }`}
        >
          {['explore', 'search', 'hotspots'].includes(currentScreen) && (
            <div role="status" className="mx-4 mt-2 rounded-xl bg-[#f1f4f9] p-3 text-[12px] text-[#42493e]">
              {discoveryLoading ? 'Loading birds and hotspots from eBird...' : discoveryError || (discovery ? `eBird - ${discovery.region}. Retrieved ${new Date(discovery.fetchedAt).toLocaleString()}. Recent reports: past 14 days. ${discovery.cached ? 'Using server cache.' : ''}` : 'External discovery has not loaded.')}
              {discoveryError && <button type="button" className="ml-2 font-semibold text-[#154212] underline" onClick={() => setDiscoveryAttempt((prev) => prev + 1)}>Try again</button>}
            </div>
          )}
          {currentScreen === 'auth' && (
            <AuthScreen
              onLoginSuccess={acceptSession}
              showToast={showToast}
            />
          )}

          {currentScreen === 'explore' && (
            <ExploreScreen
              observerName={userProfile.name}
              speciesList={discovery?.species.filter((s) => s.recentObservations?.length) || []}
              externalDiscovery
              discoveryRegion={discovery?.region}
              onSelectSpecies={handleSelectSpecies}
              onNavigate={navigateTo}
              onQuickLog={handleQuickLog}
            />
          )}

          {currentScreen === 'community' && (
            <CommunityScreen
              posts={posts}
              onNavigate={navigateTo}
              onSelectSpeciesById={handleSelectSpeciesById}
              onToggleLike={handleToggleLike}
              onToggleSave={handleToggleSavePost}
              onAddComment={handleAddComment}
              showToast={showToast}
            />
          )}

          {currentScreen === 'hotspots' && (
            <HotspotsScreen
              hotspots={discovery?.hotspots || []}
              externalDiscovery
              onSelectHotspot={handleSelectHotspot}
              onNavigate={navigateTo}
              showToast={showToast}
            />
          )}

          {currentScreen === 'journal' && (
            <JournalScreen
              entries={journalEntries}
              onNavigate={navigateTo}
              onToggleLifeList={handleToggleJournalLifeList}
              onDeleteEntry={handleDeleteJournalEntry}
              showToast={showToast}
            />
          )}

          {currentScreen === 'profile' && (
            <ProfileScreen
              userProfile={userProfile}
              onUpdateProfile={handleUpdateProfile}
              onNavigate={navigateTo}
              onSelectSpeciesByName={handleSelectSpeciesByName}
              showToast={showToast}
            />
          )}

          {currentScreen === 'species-detail' && (
            <SpeciesDetailScreen
              key={selectedSpecies.id}
              species={speciesList.find((s) => s.id === selectedSpecies.id) || selectedSpecies}
              onNavigate={navigateTo}
              onQuickLog={handleQuickLog}
              showToast={showToast}
            />
          )}

          {currentScreen === 'log-observation' && (
            <LogObservationScreen
              initialSpecies={selectedSpecies}
              userProfile={userProfile}
              onPostObservation={handlePostObservation}
              onNavigate={navigateTo}
              showToast={showToast}
            />
          )}

          {currentScreen === 'hotspot-detail' && (
            <HotspotDetailScreen
              key={selectedHotspot.id}
              hotspot={discovery?.hotspots.find((h) => h.id === selectedHotspot.id) || hotspotsList.find((h) => h.id === selectedHotspot.id) || selectedHotspot}
              onToggleSave={handleToggleSaveHotspot}
              onNavigate={navigateTo}
              onSelectSpeciesByName={handleSelectSpeciesByName}
              showToast={showToast}
            />
          )}

          {currentScreen === 'life-list' && (
            <LifeListScreen
              speciesList={speciesList}
              onSelectSpecies={handleSelectSpecies}
              onNavigate={navigateTo}
            />
          )}

          {currentScreen === 'quiz' && (
            <BirdQuizScreen onNavigate={navigateTo} showToast={showToast} />
          )}

          {currentScreen === 'messages' && (
            <FieldChatScreen onNavigate={navigateTo} showToast={showToast} />
          )}

          {currentScreen === 'search' && (
            <GlobalSearchScreen
              externalDiscovery
              speciesList={discovery?.species || []}
              hotspots={discovery?.hotspots || []}
              posts={posts}
              onSelectSpecies={handleSelectSpecies}
              onSelectHotspot={handleSelectHotspot}
              onNavigate={navigateTo}
            />
          )}

          {currentScreen === 'notifications' && (
            <NotificationsScreen
              notifications={notifications}
              onMarkAllRead={handleMarkAllNotificationsRead}
              onSelectNotification={handleSelectNotification}
              onNavigate={navigateTo}
            />
          )}

          {currentScreen === 'settings' && (
            <SettingsScreen
              userProfile={userProfile}
              onUpdateProfile={handleUpdateProfile}
              onLogout={handleLogout}
              email={sessionUser?.email || ''}
              onNavigate={navigateTo}
              showToast={showToast}
            />
          )}
        </main>

        {/* Persistent Bottom Navigation on Main Tabs */}
        {isMainTab && (
          <BottomNav currentScreen={currentScreen} onNavigate={navigateTo} />
        )}

        {/* Global Floating Toast Alert */}
        {toastMessage && (
          <div role="status" aria-live="polite" className="fixed top-20 inset-x-4 mx-auto max-w-xs z-50 bg-[#2d3135] text-[#eef1f6] py-2.5 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
            <span
              className="material-symbols-outlined text-[18px] text-[#a1d494]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <span className="text-[12px] font-semibold text-center">{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
