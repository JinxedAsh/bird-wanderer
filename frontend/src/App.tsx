/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { auth, SessionExpiredError, type AuthUser } from './lib/auth';
import { observations, observationEntry, observationPost, type PublicBirder } from './lib/observations';
import { alerts, type AlertSubscription } from './lib/alerts';
import { activity, type DiscoveryActivity, type SaveKind } from './lib/activity';
import { distanceKm, nearbyRadiusKm, type LocationPoint } from './lib/location';
import { loadLocationWeather } from './lib/discovery';
import { LocationPicker } from './components/LocationPicker';
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
  HOTSPOTS_DATA,
} from './data/mockData';

import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ExploreScreen } from './components/ExploreScreen';
import { CommunityScreen } from './components/CommunityScreen';
import { HotspotsScreen } from './components/HotspotsScreen';
const JournalScreen=React.lazy(()=>import('./components/JournalScreen').then(module=>({default:module.JournalScreen})));
import { ProfileScreen } from './components/ProfileScreen';
import { SpeciesDetailScreen } from './components/SpeciesDetailScreen';
import { LogObservationScreen } from './components/LogObservationScreen';
import { HotspotDetailScreen } from './components/HotspotDetailScreen';
import { LifeListScreen } from './components/LifeListScreen';
const BirdQuizScreen=React.lazy(()=>import('./components/BirdQuizScreen').then(module=>({default:module.BirdQuizScreen})));
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
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [birders,setBirders] = useState<PublicBirder[]>([]);
  const [ownPages,setOwnPages]=useState(1);
  const [feedPages,setFeedPages]=useState(1);
  const [peoplePages,setPeoplePages]=useState(1);
  const [ownNext,setOwnNext]=useState<number|null>(null);
  const [feedNext,setFeedNext]=useState<number|null>(null);
  const [peopleNext,setPeopleNext]=useState<number|null>(null);
  const [recordsAttempt, setRecordsAttempt] = useState(0);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState('');
  const recordsOwner = useRef<string|null>(null);
  const recordsController = useRef<AbortController|null>(null);
  const recordMutation = useRef(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [subscriptions, setSubscriptions] = useState<AlertSubscription[]>([]);
  const [alertsError, setAlertsError] = useState('');
  const [alertsAttempt, setAlertsAttempt] = useState(0);
  const [personTarget,setPersonTarget]=useState<{id:string;request:number}|null>(null);
  const [alertPost, setAlertPost] = useState<{ id: string; request: number } | null>(null);
  useEffect(() => {
    if (currentScreen !== 'community') {setAlertPost(null);setPersonTarget(null);}
  }, [currentScreen]);
  const [opportunitiesEnabled,setOpportunitiesEnabled]=useState(false);
  const [opportunityChecks,setOpportunityChecks]=useState<Array<{id:string;checkedAt:number;status:'ok'|'unavailable'}>>([]);
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState('Firebase push is not configured.');
  const alertsController = useRef<AbortController | null>(null);
  const alertMutation = useRef(false);
  useEffect(() => {
    if (!sessionUser) return;
    const owner = sessionUser.id,
      controller = new AbortController();
    alertsController.current = controller;
    let loading = false;
    const load = async () => {
      if (loading || document.hidden) return;
      loading = true;
      try {
        const state = await alerts.load(controller.signal);
        if (!controller.signal.aborted && recordsOwner.current === owner) {
          setSubscriptions(state.subscriptions);
          setNotifications(state.notifications);
          setOpportunitiesEnabled(state.opportunity?.enabled||false);setOpportunityChecks(state.opportunity?.checks||[]);
          setPushStatus(state.push.message);
          setDeviceRegistered(state.push.deviceRegistered || false);
          setPushConfigured(state.push.configured);
          setAlertsError('');
        }
      } catch (error) {
        if (!controller.signal.aborted && recordsOwner.current === owner) {
          if (error instanceof SessionExpiredError) resetSession();
          else setAlertsError(error instanceof Error ? error.message : 'Alerts are unavailable.');
        }
      } finally {
        loading = false;
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    const visible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('bird-push', visible);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('bird-push', visible);
    };
  }, [sessionUser?.id, alertsAttempt]);
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
  const [location, setLocation] = useState<LocationPoint | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [exploreWeather, setExploreWeather] = useState<{ key: string; data?: Awaited<ReturnType<typeof loadLocationWeather>>; error?: string }>({ key: '' });
  const [exploreWeatherAttempt, setExploreWeatherAttempt] = useState(0);
  const locationKey = location ? `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}` : '';

  useEffect(() => {
    if (!sessionUser || !location || currentScreen !== 'explore') return;
    const controller = new AbortController();
    const key = locationKey;
    setExploreWeather({ key });
    loadLocationWeather(location.latitude, location.longitude, controller.signal).then((data) => {
      if (!controller.signal.aborted) setExploreWeather({ key, data });
    }).catch((error) => {
      if (!controller.signal.aborted) {
        if (error instanceof SessionExpiredError) resetSession();
        else setExploreWeather({ key, error: error.message || 'Location weather is unavailable.' });
      }
    });
    return () => controller.abort();
  }, [sessionUser?.id, currentScreen, locationKey, exploreWeatherAttempt]);

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

  useEffect(() => {
    if (!sessionUser) return;
    const owner=sessionUser.id, controller=new AbortController();
    recordsController.current?.abort(); recordsController.current=controller;
    setRecordsLoading(true); setRecordsError('');
    const records=async(feed:boolean,pages:number)=>{
      const result=await observations.load(controller.signal,feed);
      for(let page=1;page<pages&&result.nextOffset!==null;page++){
        const next=await observations.load(controller.signal,feed,result.nextOffset);result.observations.push(...next.observations);result.nextOffset=next.nextOffset;
      }return result;
    };
    const peopleResults=async()=>{
      const result=await observations.peoplePage(controller.signal);
      for(let page=1;page<peoplePages&&result.nextOffset!==null;page++){
        const next=await observations.peoplePage(controller.signal,'',result.nextOffset);result.people.push(...next.people);result.nextOffset=next.nextOffset;
      }return result;
    };
    Promise.all([records(false,ownPages),records(true,feedPages),peopleResults(),alertPost?observations.get(alertPost.id,controller.signal).catch(error=>{if(error instanceof SessionExpiredError)throw error;return null;}):Promise.resolve(null)]).then(([own,feed,people,target])=>{
      if(controller.signal.aborted||recordsOwner.current!==owner)return;
      setOwnNext(own.nextOffset);setFeedNext(feed.nextOffset);setPeopleNext(people.nextOffset);
      setBirders(people.people);setUserProfile(own.profile);setJournalEntries(own.observations.map(observationEntry));setPosts((target?[target,...feed.observations.filter(row=>row.id!==target.id)]:feed.observations).map(observationPost));
      if(alertPost&&!target){setAlertPost(null);showToast('This observation is no longer available.');}
    }).catch(error=>{
      if(controller.signal.aborted||recordsOwner.current!==owner)return;
      if(error instanceof SessionExpiredError)resetSession();else setRecordsError(error.message||'Field records could not load.');
    }).finally(()=>{if(!controller.signal.aborted&&recordsOwner.current===owner)setRecordsLoading(false);});
    return()=>controller.abort();
  },[sessionUser?.id,recordsAttempt,ownPages,feedPages,peoplePages]);

  const acceptSession = (user: AuthUser) => {
    setOwnPages(1);setFeedPages(1);setPeoplePages(1);setOwnNext(null);setFeedNext(null);setPeopleNext(null);setPersonTarget(null);
    alertsController.current?.abort();alertMutation.current=false;recordsController.current?.abort();recordsOwner.current=user.id;setBirders([]);recordMutation.current=false;setRecordsError('');
    setLocation(null);
    setLocationPickerOpen(false);
    setExploreWeather({ key: '' });
    activityController.current?.abort();
    activityOwner.current = user.id;
    activityPending.current = false;
    setActivityBusy(false);
    setActivityReady(false);
    setDiscoveryActivity({ saves: [], searches: [] });
    setActivityError('');
    setSessionUser(user);
    setUserProfile({ ...INITIAL_USER_PROFILE, name: user.name, handle: '',bio:'',primaryRig:'',location:'',title:'Birder',avatarUrl:'/bird-wanderer-logo.svg',birdsCount:0,photosCount:0,tripsCount:0 });
    setPosts([]);
    setJournalEntries([]);
    setNotifications([]);setSubscriptions([]);setAlertsError('');setAlertPost(null);setDeviceRegistered(false);setPushConfigured(false);setPushBusy(false);setOpportunitiesEnabled(false);setOpportunityChecks([]);
    setSpeciesList(SPECIES_DATABASE);
    setHotspotsList(HOTSPOTS_DATA);
    setNavigationHistory([{ screen: 'explore' }]);
    setCurrentScreen(new URLSearchParams(window.location.search).has('notifications')?'notifications':'explore');
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
  const handleToggleLike = (postId:string) => {
    const post=posts.find(row=>row.id===postId);
    if(post)void changeRecord(signal=>observations.like(postId,!post.isLiked,signal));
  };
  const handleToggleSavePost = (postId:string) => {
    const post=posts.find(row=>row.id===postId);
    if(post)void changeRecord(signal=>observations.savePost(postId,!post.isSaved,signal));
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

  const handleAddComment = (postId:string,text:string) => changeRecord(signal=>observations.comment(postId,text,signal));

  const changeRecord = async (change:(signal:AbortSignal)=>Promise<unknown>) => {
    const owner=recordsOwner.current,controller=recordsController.current;
    if(!owner||!controller||controller.signal.aborted)return;
    if(recordMutation.current){showToast('Please wait for your current field-record change.');return false;}
    recordMutation.current=true;
    try {await change(controller.signal);if(recordsOwner.current===owner&&!controller.signal.aborted){setRecordsAttempt(value=>value+1);return true;}return false;}
    catch(error){if(controller.signal.aborted||recordsOwner.current!==owner)return false;if(error instanceof SessionExpiredError)resetSession();else showToast(error instanceof Error?error.message:'Could not save your change.');return false;}
    finally{if(recordsOwner.current===owner)recordMutation.current=false;}
  };
  const loadPublicBirder = async(id:string) => {
    const controller=recordsController.current,owner=recordsOwner.current;
    if(!controller||!owner||controller.signal.aborted)throw new DOMException('Aborted','AbortError');
    try {
      const person=await observations.person(id,controller.signal);
      if(controller.signal.aborted||recordsOwner.current!==owner)throw new DOMException('Aborted','AbortError');
      return person;
    } catch(error){if(!controller.signal.aborted&&recordsOwner.current===owner&&error instanceof SessionExpiredError)resetSession();throw error;}
  };
  const handleToggleJournalLifeList = (entryId: string) => {
    const entry=journalEntries.find(row=>row.id===entryId);
    if(entry)return changeRecord(signal=>observations.update(entryId,{inLifeList:!entry.inLifeList},signal));
    return Promise.resolve(false);
  };
  const handleDeleteJournalEntry = (entryId: string) => changeRecord(signal=>observations.remove(entryId,signal));
  const handlePostObservation = () => {setRecordsAttempt(value=>value+1);};

  const changeAlert = async (change: (signal: AbortSignal) => Promise<unknown>) => {
    const owner = recordsOwner.current,
      controller = alertsController.current;
    if (!owner || !controller || controller.signal.aborted || alertMutation.current) return false;
    alertMutation.current = true;
    try {
      await change(controller.signal);
      if (recordsOwner.current !== owner || controller.signal.aborted) return false;
      setAlertsAttempt((value) => value + 1);
      return true;
    } catch (error) {
      if (!controller.signal.aborted && recordsOwner.current === owner) {
        if (error instanceof SessionExpiredError) resetSession();
        else showToast(error instanceof Error ? error.message : 'Alert change failed.');
      }
      return false;
    } finally {
      if (recordsOwner.current === owner) alertMutation.current = false;
    }
  };
  const isSubscribed = (kind: AlertSubscription['kind'], id: string) =>
    subscriptions.some((row) => row.kind === kind && row.id === id);
  const toggleSubscription = async (kind: AlertSubscription['kind'], id: string) => {
    const enabled = !isSubscribed(kind, id);
    if (await changeAlert((signal) => alerts.subscribe(kind, id, enabled, signal)))
      showToast(
        enabled
          ? userProfile.pushAlertsEnabled
            ? 'Subscription saved for future sightings.'
            : 'Subscription saved. Enable sighting alerts in Notifications.'
          : 'Subscription removed.',
      );
  };
  const handleMarkAllNotificationsRead = () => {
    void changeAlert((signal) => alerts.read(null, signal));
  };
  const handleOpenPerson=(id:string)=>{setPersonTarget({id,request:Date.now()});navigateTo('community');};
  const handleOpenObservation=(id:string)=>{
    const request=recordsController.current;if(!request)return;
    void observations.get(id,request.signal).then(row=>{if(request.signal.aborted)return;setPosts(previous=>[observationPost(row),...previous.filter(p=>p.id!==row.id)]);setAlertPost({id:row.id,request:Date.now()});navigateTo('community');}).catch(error=>{if(!request.signal.aborted){if(error instanceof SessionExpiredError)resetSession();else showToast(error instanceof Error?error.message:'Observation unavailable.');}});
  };
  const handleSelectNotification = (notif: AppNotification) => {
    void changeAlert(async (signal) => {
      await alerts.read(notif.id, signal);
      if(notif.opportunityId&&notif.hotspotId){handleSelectHotspotById(notif.hotspotId);return;}
      if(notif.personId){handleOpenPerson(notif.personId);return;}
      if (!notif.observationId) return;
      const row = await observations.get(notif.observationId, signal);
      if (signal.aborted) return;
      setPosts((previous) => [observationPost(row), ...previous.filter((post) => post.id !== row.id)]);
      setAlertPost({ id: row.id, request: Date.now() });
      navigateTo('community');
    });
  };

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    return changeRecord(signal=>observations.profile(updated,signal));
  };

  const isMainTab = ['explore', 'community', 'hotspots', 'journal', 'profile'].includes(
    currentScreen
  );

  const unreadNotifsCount = notifications.filter((n) => n.isUnread).length;

  function resetSession() {
    setOwnPages(1);setFeedPages(1);setPeoplePages(1);setOwnNext(null);setFeedNext(null);setPeopleNext(null);
    alertsController.current?.abort();alertMutation.current=false;recordsController.current?.abort();recordsOwner.current=null;setBirders([]);recordMutation.current=false;setRecordsError('');setRecordsLoading(false);
    setLocation(null);
    setLocationPickerOpen(false);
    setExploreWeather({ key: '' });
    activityController.current?.abort();
    activityOwner.current = null;
    activityPending.current = false;
    setDiscoveryActivity({ saves: [], searches: [] });
    setActivityReady(false);
    setActivityBusy(false);
    setActivityError('');
    setPersonTarget(null);
    setSessionUser(null);
    setSessionError('');
    setUserProfile(INITIAL_USER_PROFILE);
    setPosts([]);
    setJournalEntries([]);
    setNotifications([]);setSubscriptions([]);setAlertsError('');setAlertPost(null);setDeviceRegistered(false);setPushConfigured(false);setPushBusy(false);setOpportunitiesEnabled(false);setOpportunityChecks([]);
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

  const externalHotspots = discovery?.hotspots.map((hotspot) => ({ ...hotspot, isSaved: isDiscoverySaved('hotspot', hotspot.id), distanceKm: location ? distanceKm(location, hotspot) : null })) || [];
  const nearbyIds = new Set(externalHotspots.filter((hotspot) => hotspot.distanceKm !== null && hotspot.distanceKm <= nearbyRadiusKm).map((hotspot) => hotspot.id));
  const exploreSpecies = discovery?.species.filter((bird) => bird.recentObservations?.some((report) => !location || nearbyIds.has(report.hotspotId))) || [];
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
          {sessionUser && locationPickerOpen && ['explore', 'hotspots'].includes(currentScreen) && (
            <LocationPicker location={location} onSelect={setLocation} onClose={() => setLocationPickerOpen(false)} />
          )}
          {sessionUser && !activityReady && (
            <div role="status" className="mx-4 mt-2 rounded-xl bg-[#f1f4f9] p-3 text-[12px] text-[#42493e]">
              {activityError || 'Loading your saved birds, hotspots and searches...'}
              {activityError && <button type="button" className="ml-2 font-semibold text-[#154212] underline" onClick={() => setActivityAttempt((prev) => prev + 1)}>Try again</button>}
            </div>
          )}
          {sessionUser && (recordsLoading || recordsError) && <div role={recordsError?'alert':'status'} className="mx-4 mt-2 rounded-xl bg-[#f1f4f9] p-3 text-[12px] text-[#42493e]">{recordsError||'Loading your field records…'}{recordsError&&<button type="button" onClick={()=>setRecordsAttempt(value=>value+1)} className="min-h-11 ml-2 underline">Retry field records</button>}</div>}
          {['journal','life-list','profile'].includes(currentScreen)&&userProfile.photosCount>journalEntries.length&&<p className="mx-4 text-xs text-[#42493e]">Showing {journalEntries.length} of {userProfile.photosCount} field records. Totals cover all records; load older pages to include their details/species.</p>}
          {['journal','life-list','profile'].includes(currentScreen)&&ownNext!==null&&<button disabled={recordsLoading} onClick={()=>setOwnPages(n=>n+1)} className="mx-4 min-h-11 underline">Load older field records</button>}
          {currentScreen==='community'&&<div className="mx-4 flex gap-4">{feedNext!==null&&<button disabled={recordsLoading} onClick={()=>setFeedPages(n=>n+1)} className="min-h-11 underline">Load older community posts</button>}{peopleNext!==null&&<button disabled={recordsLoading} onClick={()=>setPeoplePages(n=>n+1)} className="min-h-11 underline">Load more birders</button>}</div>}
          {['explore', 'search', 'hotspots'].includes(currentScreen) && (
            <div role="status" className="mx-4 mt-2 rounded-xl bg-[#f1f4f9] p-3 text-[12px] text-[#42493e]">
              {discoveryLoading ? 'Loading birds and hotspots from eBird...' : discoveryError || (discovery ? `eBird - ${discovery.coverageLabel || discovery.region}. Retrieved ${new Date(discovery.fetchedAt).toLocaleString()}. Recent reports: past 14 days. ${discovery.cached ? 'Using server cache.' : ''}` : 'External discovery has not loaded.')}
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
              location={location}
              onChooseLocation={() => setLocationPickerOpen(true)}
              weather={exploreWeather.key === locationKey ? exploreWeather.data : undefined}
              weatherError={exploreWeather.key === locationKey ? exploreWeather.error : undefined}
              onRetryWeather={() => setExploreWeatherAttempt((attempt) => attempt + 1)}
              onSessionExpired={resetSession}
              observerName={userProfile.name}
              speciesList={exploreSpecies}
              externalDiscovery
              discoveryRegion={discovery?.coverageLabel || discovery?.region}
              onSelectSpecies={handleSelectSpecies}
              onNavigate={navigateTo}
              onQuickLog={handleQuickLog}
            />
          )}

          {currentScreen === 'community' && (
            <CommunityScreen
              openPerson={personTarget}
              openPost={alertPost}
              people={birders}
              onToggleFollow={(id,following)=>changeRecord(signal=>observations.follow(id,following,signal))}
              onPersonDetails={loadPublicBirder}
              onReport={(id,reason,detail)=>changeRecord(signal=>observations.report(id,reason,detail,signal))}
              onDeleteComment={id=>changeRecord(signal=>observations.deleteComment(id,signal))}
              nearbyEnabled={Boolean(location)}
              onChooseLocation={()=>{navigateTo('explore');setLocationPickerOpen(true);}}
              posts={posts.map(post=>{const point=discovery?.hotspots.find(h=>h.name===post.location);return {...post,isNearby:Boolean(location&&point&&(distanceKm(location,point)??Infinity)<=nearbyRadiusKm)};})}
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
              nearbyEnabled={Boolean(location)}
              onChooseLocation={() => setLocationPickerOpen(true)}
              hotspots={externalHotspots}
              externalDiscovery
              onSelectHotspot={handleSelectHotspot}
              onNavigate={navigateTo}
              showToast={showToast}
            />
          )}

          {currentScreen === 'journal' && (
            <React.Suspense fallback={<p role="status" className="p-4">Loading journal…</p>}><JournalScreen key={sessionUser?.id} totals={userProfile} speciesList={discovery?.species||[]} hotspots={discovery?.hotspots||[]} onRecordChanged={handlePostObservation} onSessionExpired={resetSession}
              entries={journalEntries}
              onNavigate={navigateTo}
              onToggleLifeList={handleToggleJournalLifeList}
              onDeleteEntry={handleDeleteJournalEntry}
              showToast={showToast}
            /></React.Suspense>
          )}

          {currentScreen === 'profile' && (
            <ProfileScreen
              entries={journalEntries}
              userProfile={userProfile}
              onUpdateProfile={handleUpdateProfile}
              onNavigate={navigateTo}
              onSelectSpeciesByName={handleSelectSpeciesByName}
              showToast={showToast}
            />
          )}

          {currentScreen === 'species-detail' && (
            <SpeciesDetailScreen
              subscribed={isSubscribed('species',selectedSpecies.id)}
              onToggleSubscription={()=>void toggleSubscription('species',selectedSpecies.id)}
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
              key={sessionUser?.id}
              speciesList={discovery?.species || []}
              hotspots={discovery?.hotspots || []}
              onSessionExpired={resetSession}
              initialSpecies={selectedSpecies}
              userProfile={userProfile}
              onPostObservation={handlePostObservation}
              onNavigate={navigateTo}
              showToast={showToast}
            />
          )}

          {currentScreen === 'hotspot-detail' && (
            <HotspotDetailScreen
              subscribed={isSubscribed('hotspot',selectedHotspot.id)}
              onToggleSubscription={()=>void toggleSubscription('hotspot',selectedHotspot.id)}
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
              speciesList={(discovery?.species || []).filter(bird=>journalEntries.some(entry=>entry.inLifeList&&entry.scientificName===bird.scientificName)||isDiscoverySaved('species',bird.id)).map(bird=>({ ...bird,isLogged:journalEntries.some(entry=>entry.inLifeList&&entry.scientificName===bird.scientificName),isWishlist:isDiscoverySaved('species',bird.id),photosCount:journalEntries.filter(entry=>entry.scientificName===bird.scientificName).length,firstSightingLocation:journalEntries.find(entry=>entry.scientificName===bird.scientificName)?.location }))}
              onSelectSpecies={handleSelectSpecies}
              onNavigate={navigateTo}
            />
          )}

          {currentScreen === 'quiz' && (
            <React.Suspense fallback={<p role="status" className="p-4 text-[13px]">Loading practice…</p>}><BirdQuizScreen key={sessionUser?.id} onSessionExpired={resetSession} onNavigate={navigateTo} showToast={showToast} /></React.Suspense>
          )}

          {currentScreen === 'messages' && (
            <FieldChatScreen key={sessionUser?.id} onNavigate={navigateTo} showToast={showToast} hotspots={externalHotspots} onSessionExpired={resetSession} onOpenHotspot={handleSelectHotspotById} onOpenObservation={handleOpenObservation} />
          )}

          {currentScreen === 'search' && (
            <GlobalSearchScreen key={sessionUser?.id} onOpenPerson={handleOpenPerson} onOpenPost={handleOpenObservation}
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
              opportunitiesEnabled={opportunitiesEnabled}
              onToggleOpportunities={()=>void changeAlert(signal=>alerts.opportunity(!opportunitiesEnabled,signal))}
              opportunityChecks={opportunityChecks}
              enabled={userProfile.pushAlertsEnabled}
              onToggleEnabled={()=>void handleUpdateProfile({pushAlertsEnabled:!userProfile.pushAlertsEnabled})}
              subscriptions={subscriptions}
              onRemoveSubscription={(kind,id)=>void toggleSubscription(kind,id)}
              error={alertsError}
              onRetry={()=>setAlertsAttempt(value=>value+1)}
              pushConfigured={pushConfigured}
              deviceRegistered={deviceRegistered}
              pushBusy={pushBusy}
              onTogglePush={()=>{
                if(pushBusy)return;
                // Ask during the actual click, before imports/network lose the browser's user gesture.
                const permission=!deviceRegistered&&typeof Notification!=='undefined'?Notification.requestPermission().catch(()=>'denied' as const):Promise.resolve('granted' as const);
                setPushBusy(true);
                void changeAlert(async signal=>{
                  const client=await import('./lib/push');
                  if(signal.aborted)return;
                  if(deviceRegistered)await client.disablePush(signal);else await client.enablePush(signal,permission);
                }).finally(()=>setPushBusy(false));
              }}
              pushStatus={pushStatus}
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
