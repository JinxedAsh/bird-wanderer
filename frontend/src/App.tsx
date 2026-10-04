/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { auth, SessionExpiredError, type AuthUser } from './lib/auth';
import { activity, type DiscoveryActivity, type SaveKind } from './lib/activity';
import { loadDiscovery, loadSpeciesLocations, loadHotspotDetails, loadHotspotWeather, type DiscoveryCatalogue, type SpeciesLocations, type HotspotDetails, type HotspotWeather } from './lib/discovery';
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

interface NavigationEntry {
  screen: ScreenType;
  species?: BirdSpecies;
  hotspot?: Hotspot;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('auth');
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [navigationHistory, setNavigationHistory] = useState<NavigationEntry[]>([{ screen: 'explore' }]);

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
  const [discoveryActivity, setDiscoveryActivity] = useState<DiscoveryActivity>({ saves: [], searches: [] });
  const [activityReady, setActivityReady] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [activityAttempt, setActivityAttempt] = useState(0);
  const [activityBusy, setActivityBusy] = useState(false);
  const activityPending = useRef(false);
  const activityController = useRef<AbortController | null>(null);
  const activityOwner = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionUser) return;
    const owner = sessionUser.id;
    const controller = new AbortController();
    activityController.current = controller;
    setActivityReady(false);
    setActivityError('');
    activity.load(controller.signal).then((data) => {
      if (!controller.signal.aborted && activityOwner.current === owner) {
        setDiscoveryActivity(data);
        setActivityReady(true);
      }
    }).catch((error) => {
      if (!controller.signal.aborted && activityOwner.current === owner) {
        if (error instanceof SessionExpiredError) resetSession();
        else setActivityError(error.message || 'Saved items and searches are unavailable.');
      }
    });
    return () => controller.abort();
  }, [sessionUser?.id, activityAttempt]);

  useEffect(() => {
    setDiscovery(null);
    setDiscoveryError('');
    if (!sessionUser) { setDiscoveryLoading(false); return; }
    const controller = new AbortController();
    setDiscoveryLoading(true);
    loadDiscovery(controller.signal).then((data) => {
      if (!controller.signal.aborted) setDiscovery(data);
    }).catch((error) => {
      if (!controller.signal.aborted) {
        if (error instanceof SessionExpiredError) resetSession();
        else setDiscoveryError(error.message || 'Discovery is unavailable.');
      }
    }).finally(() => {
      if (!controller.signal.aborted) setDiscoveryLoading(false);
    });
    return () => controller.abort();
  }, [sessionUser?.id, discoveryAttempt]);

  const acceptSession = (user: AuthUser) => {
    activityController.current?.abort();
    activityOwner.current = user.id;
    activityPending.current = false;
    setActivityBusy(false);
    setActivityReady(false);
    setDiscoveryActivity({ saves: [], searches: [] });
    setActivityError('');
    setSessionUser(user);
    setUserProfile({ ...INITIAL_USER_PROFILE, name: user.name, handle: `@${user.name.toLowerCase().replace(/\s+/g, '')}` });
    setPosts(COMMUNITY_POSTS);
    setJournalEntries(JOURNAL_ENTRIES);
    setNotifications(APP_NOTIFICATIONS);
    setSpeciesList(SPECIES_DATABASE);
    setHotspotsList(HOTSPOTS_DATA);
    setNavigationHistory([{ screen: 'explore' }]);
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

  // Recheck when returning to the app: the cookie may have expired or been
  // signed out in another tab. A connection failure does not prove logout.
  useEffect(() => {
    if (!sessionUser) return;
    let active = true;
    let pending = false;
    const check = async () => {
      if (document.visibilityState === 'hidden' || pending) return;
      pending = true;
      try {
        const user = await auth.me();
        if (active && !user) resetSession();
      } catch { /* Keep the session UI during a temporary network failure. */ }
      finally { pending = false; }
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      active = false;
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [sessionUser?.id]);

  // Selected item states
  const [selectedSpecies, setSelectedSpecies] = useState<BirdSpecies>(SPECIES_DATABASE[1]); // Common Kingfisher by default
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot>(HOTSPOTS_DATA[1]); // Okhla Sanctuary
  const [speciesLocations, setSpeciesLocations] = useState<{ id: string; data?: SpeciesLocations; error?: string }>({ id: '' });
  const [hotspotDetails, setHotspotDetails] = useState<{ id: string; data?: HotspotDetails; error?: string }>({ id: '' });
  const [hotspotWeather, setHotspotWeather] = useState<{ id: string; data?: HotspotWeather; error?: string }>({ id: '' });
  const [weatherAttempt, setWeatherAttempt] = useState(0);
  const [detailAttempt, setDetailAttempt] = useState(0);

  useEffect(() => {
    if (!sessionUser || currentScreen !== 'species-detail' || !selectedSpecies.source) return;
    const id = selectedSpecies.id;
    const controller = new AbortController();
    setSpeciesLocations({ id });
    loadSpeciesLocations(id, controller.signal).then((data) => {
      if (!controller.signal.aborted) setSpeciesLocations({ id, data });
    }).catch((error) => {
      if (!controller.signal.aborted) {
        if (error instanceof SessionExpiredError) resetSession();
        else setSpeciesLocations({ id, error: error.message });
      }
    });
    return () => controller.abort();
  }, [sessionUser?.id, currentScreen, selectedSpecies.id, selectedSpecies.source, detailAttempt]);

  useEffect(() => {
    if (!sessionUser || currentScreen !== 'hotspot-detail' || !selectedHotspot.source) return;
    const id = selectedHotspot.id;
    const controller = new AbortController();
    setHotspotDetails({ id });
    loadHotspotDetails(id, controller.signal).then((data) => {
      if (!controller.signal.aborted) setHotspotDetails({ id, data });
    }).catch((error) => {
      if (!controller.signal.aborted) {
        if (error instanceof SessionExpiredError) resetSession();
        else setHotspotDetails({ id, error: error.message });
      }
    });
    return () => controller.abort();
  }, [sessionUser?.id, currentScreen, selectedHotspot.id, selectedHotspot.source, detailAttempt]);

  useEffect(() => {
    if (!sessionUser || currentScreen !== 'hotspot-detail' || !selectedHotspot.source) return;
    const id = selectedHotspot.id;
    const controller = new AbortController();
    setHotspotWeather({ id });
    loadHotspotWeather(id, controller.signal).then((data) => {
      if (!controller.signal.aborted) setHotspotWeather({ id, data });
    }).catch((error) => {
      if (!controller.signal.aborted) {
        if (error instanceof SessionExpiredError) resetSession();
        else setHotspotWeather({ id, error: error.message });
      }
    });
    return () => controller.abort();
  }, [sessionUser?.id, currentScreen, selectedHotspot.id, selectedHotspot.source, weatherAttempt]);

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

  const navigateTo = (screen: ScreenType, selection?: { species?: BirdSpecies; hotspot?: Hotspot }) => {
    if (!sessionUser && screen !== 'auth') return;
    if (screen === currentScreen) return;
    setNavigationHistory((prev) => [...prev, {
      screen,
      species: screen === 'species-detail' ? selection?.species || selectedSpecies : undefined,
      hotspot: screen === 'hotspot-detail' ? selection?.hotspot || selectedHotspot : undefined,
    }]);
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBack = () => {
    if (navigationHistory.length > 1) {
      const nextHistory = [...navigationHistory];
      nextHistory.pop(); // Remove current screen
      const previous = nextHistory[nextHistory.length - 1];
      setNavigationHistory(nextHistory);
      if (previous.species) setSelectedSpecies(previous.species);
      if (previous.hotspot) setSelectedHotspot(previous.hotspot);
      setCurrentScreen(previous.screen);
    } else {
      setCurrentScreen('explore');
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Quick navigation handlers
  const handleSelectSpecies = (species: BirdSpecies) => {
    setSelectedSpecies(species);
    navigateTo('species-detail', { species });
  };

  const handleSelectSpeciesByName = (name: string) => {
    const found = discovery?.species.find((s) => s.name.toLowerCase() === name.toLowerCase()) || speciesList.find((s) => s.name.toLowerCase().includes(name.toLowerCase()));
    if (found) {
      setSelectedSpecies(found);
      navigateTo('species-detail', { species: found });
    } else {
      showToast('This species is not available in the sample catalogue yet.');
    }
  };

  const handleSelectSpeciesById = (speciesId: string) => {
    const found = discovery?.species.find((s) => s.id === speciesId) || speciesList.find((s) => s.id === speciesId);
    if (found) {
      setSelectedSpecies(found);
      navigateTo('species-detail', { species: found });
    } else {
      showToast('This species is not available in the loaded catalogue.');
    }
  };

  const handleSelectHotspot = (hotspot: Hotspot) => {
    setSelectedHotspot(hotspot);
    navigateTo('hotspot-detail', { hotspot });
  };

  const handleSelectHotspotById = (id: string) => {
    const hotspot = discovery?.hotspots.find((h) => h.id === id);
    if (hotspot) handleSelectHotspot(hotspot);
    else showToast('This hotspot is not available in the loaded region.');
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
    if (hotspot.source) {
      handleToggleDiscoverySave('hotspot', hotspot.id, hotspot.name);
      return;
    }
    setDiscovery((prev) => prev ? { ...prev, hotspots: prev.hotspots.map((h) => h.id === hotspotId ? { ...h, isSaved: !h.isSaved } : h) } : prev);
    setHotspotsList((prev) => prev.map((h) =>
      h.id === hotspotId ? { ...h, isSaved: !h.isSaved } : h
    ));
    showToast(hotspot.isSaved ? 'Removed from bookmarks' : `Saved ${hotspot.name} to field bookmarks`);
  };

  const isDiscoverySaved = (kind: SaveKind, id: string) => discoveryActivity.saves.some((item) => item.kind === kind && item.id === id);

  const updateActivity = async (change: (signal: AbortSignal) => Promise<DiscoveryActivity>, success?: string) => {
    const controller = activityController.current;
    const owner = activityOwner.current;
    if (!activityReady || !owner || !controller || controller.signal.aborted) {
      showToast('Saved items and searches have not loaded. Use Try again if needed.');
      return;
    }
    if (activityPending.current) { showToast('Please wait for your current save or search update.'); return; }
    activityPending.current = true;
    setActivityBusy(true);
    try {
      const data = await change(controller.signal);
      if (!controller.signal.aborted && activityOwner.current === owner) {
        setDiscoveryActivity(data);
        if (success) showToast(success);
      }
    } catch (error) {
      if (!controller.signal.aborted && activityOwner.current === owner) {
        if (error instanceof SessionExpiredError) resetSession();
        else showToast(error instanceof Error ? error.message : 'Could not save this change. Please try again.');
      }
    } finally {
      if (activityOwner.current === owner && activityController.current === controller) {
        activityPending.current = false;
        setActivityBusy(false);
      }
    }
  };

  const handleToggleDiscoverySave = (kind: SaveKind, id: string, name: string) => {
    const saved = !isDiscoverySaved(kind, id);
    void updateActivity((signal) => activity.save(kind, id, saved, signal), saved ? `Saved ${name} to your ${kind === 'species' ? 'field target list' : 'field bookmarks'}` : 'Removed from bookmarks');
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

  function resetSession() {
    activityController.current?.abort();
    activityOwner.current = null;
    activityPending.current = false;
    setDiscoveryActivity({ saves: [], searches: [] });
    setActivityReady(false);
    setActivityBusy(false);
    setActivityError('');
    setSessionUser(null);
    setSessionError('');
    setUserProfile(INITIAL_USER_PROFILE);
    setPosts(COMMUNITY_POSTS);
    setJournalEntries(JOURNAL_ENTRIES);
    setNotifications(APP_NOTIFICATIONS);
    setSpeciesList(SPECIES_DATABASE);
    setHotspotsList(HOTSPOTS_DATA);
    setDiscovery(null);
    setDiscoveryError('');
    setSpeciesLocations({ id: '' });
    setHotspotDetails({ id: '' });
    setHotspotWeather({ id: '' });
    setNavigationHistory([{ screen: 'auth' }]);
    setCurrentScreen('auth');
    setToastMessage(null);
  }

  const handleLogout = async () => {
    try {
      await auth.logout();
      resetSession();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not sign out. Please try again.');
    }
  };

  const externalHotspots = discovery?.hotspots.map((hotspot) => ({ ...hotspot, isSaved: isDiscoverySaved('hotspot', hotspot.id) })) || [];
  const saveDisabled = !activityReady || activityBusy;

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
          {sessionUser && !activityReady && (
            <div role="status" className="mx-4 mt-2 rounded-xl bg-[#f1f4f9] p-3 text-[12px] text-[#42493e]">
              {activityError || 'Loading your saved birds, hotspots and searches...'}
              {activityError && <button type="button" className="ml-2 font-semibold text-[#154212] underline" onClick={() => setActivityAttempt((prev) => prev + 1)}>Try again</button>}
            </div>
          )}
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
              onSessionExpired={resetSession}
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
              hotspots={externalHotspots}
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
              saved={selectedSpecies.source ? isDiscoverySaved('species', selectedSpecies.id) : undefined}
              saveDisabled={Boolean(selectedSpecies.source) && saveDisabled}
              onToggleBookmark={selectedSpecies.source ? () => handleToggleDiscoverySave('species', selectedSpecies.id, selectedSpecies.name) : undefined}
              onSessionExpired={resetSession}
              key={selectedSpecies.id}
              species={speciesList.find((s) => s.id === selectedSpecies.id) || selectedSpecies}
              onNavigate={navigateTo}
              onQuickLog={handleQuickLog}
              showToast={showToast}
              locations={speciesLocations.id === selectedSpecies.id ? speciesLocations.data : undefined}
              locationsError={speciesLocations.id === selectedSpecies.id ? speciesLocations.error : undefined}
              onRetryLocations={() => setDetailAttempt((prev) => prev + 1)}
              onSelectHotspotById={handleSelectHotspotById}
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
              saveDisabled={Boolean(selectedHotspot.source) && saveDisabled}
              key={selectedHotspot.id}
              hotspot={externalHotspots.find((h) => h.id === selectedHotspot.id) || hotspotsList.find((h) => h.id === selectedHotspot.id) || { ...selectedHotspot, isSaved: selectedHotspot.source ? isDiscoverySaved('hotspot', selectedHotspot.id) : selectedHotspot.isSaved }}
              onToggleSave={handleToggleSaveHotspot}
              onNavigate={navigateTo}
              onSelectSpeciesByName={handleSelectSpeciesByName}
              showToast={showToast}
              details={hotspotDetails.id === selectedHotspot.id ? hotspotDetails.data : undefined}
              detailsError={hotspotDetails.id === selectedHotspot.id ? hotspotDetails.error : undefined}
              onRetryDetails={() => setDetailAttempt((prev) => prev + 1)}
              weather={hotspotWeather.id === selectedHotspot.id ? hotspotWeather.data : undefined}
              weatherError={hotspotWeather.id === selectedHotspot.id ? hotspotWeather.error : undefined}
              onRetryWeather={() => setWeatherAttempt((prev) => prev + 1)}
              onSelectSpeciesById={handleSelectSpeciesById}
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
              recentSearches={discoveryActivity.searches}
              savedSpeciesIds={discoveryActivity.saves.filter((item) => item.kind === 'species').map((item) => item.id)}
              historyDisabled={saveDisabled}
              onRecordSearch={(term) => { void updateActivity((signal) => activity.search(term, signal)); }}
              onRemoveSearch={(term) => { void updateActivity((signal) => activity.removeSearch(term, signal), term ? 'Removed recent search' : 'Cleared recent searches'); }}
              onSessionExpired={resetSession}
              externalDiscovery
              speciesList={discovery?.species || []}
              hotspots={externalHotspots}
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
