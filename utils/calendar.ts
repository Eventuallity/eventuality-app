import * as Calendar from 'expo-calendar';
import { Alert, Platform } from 'react-native';

interface EventDetails {
  title: string;
  startDate: string;
  endDate: string;
  location?: string;
  description?: string;
}

async function getCalendarPermissions(): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    console.log('Permission request result:', status);
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Calendar permission is needed to add events. Please enable it in your device settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Permission error:', error);
    return false;
  }
}

async function getGoogleCalendarId(): Promise<string | null> {
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    console.log(`Found ${calendars.length} calendars`);
    
    if (calendars.length === 0) {
      Alert.alert('No Calendar Found', 'No calendars are available on this device.');
      return null;
    }

    // Log all calendars for debugging
    calendars.forEach((cal, i) => {
      console.log(`Calendar ${i}: "${cal.title}", Source: ${cal.source?.name}, Type: ${cal.source?.type}`);
    });

    // Find Google Calendar
    const googleCalendar = calendars.find(cal => 
      cal.allowsModifications && 
      (cal.source?.name?.toLowerCase().includes('google') || 
       cal.source?.type === 'com.google' ||
       cal.title?.toLowerCase().includes('google'))
    );
    
    if (googleCalendar) {
      console.log('✅ Found Google Calendar:', {
        id: googleCalendar.id,
        title: googleCalendar.title,
        source: googleCalendar.source?.name,
      });
      return googleCalendar.id;
    }

    // Fallback: Try to find iCloud Calendar (for iOS users)
    const iCloudCalendar = calendars.find(cal => 
      cal.allowsModifications && 
      (cal.source?.name?.toLowerCase().includes('icloud') ||
       cal.source?.type === 'com.apple.calendar')
    );
    
    if (iCloudCalendar) {
      console.log('✅ Using iCloud Calendar (Google Calendar not found):', {
        id: iCloudCalendar.id,
        title: iCloudCalendar.title,
      });
      return iCloudCalendar.id;
    }

    // Last resort: Use primary calendar or first available
    const fallbackCalendar = calendars.find(cal => 
      cal.allowsModifications && cal.isPrimary
    ) || calendars.find(cal => cal.allowsModifications) || calendars[0];

    console.log('⚠️ Using fallback calendar:', {
      id: fallbackCalendar.id,
      title: fallbackCalendar.title,
      source: fallbackCalendar.source?.name,
    });

    return fallbackCalendar.id;
  } catch (error) {
    console.error('Error getting calendar:', error);
    Alert.alert('Error', 'Failed to access calendar. Please try again.');
    return null;
  }
}

/**
 * Add an event to Google Calendar (or default calendar if Google not found)
 */
export async function addEventToCalendar(eventDetails: EventDetails): Promise<boolean> {
  try {
    console.log('=== Adding Event to Calendar ===');
    console.log('Event details:', eventDetails);

    // Request permissions
    const hasPermission = await getCalendarPermissions();
    if (!hasPermission) {
      console.log('Permission denied');
      return false;
    }

    // Get Google Calendar ID
    const calendarId = await getGoogleCalendarId();
    if (!calendarId) {
      console.log('No calendar ID available');
      return false;
    }

    // Convert date strings to Date objects
    const startDate = new Date(eventDetails.startDate);
    const endDate = new Date(eventDetails.endDate);

    console.log('Start date:', startDate.toISOString());
    console.log('End date:', endDate.toISOString());

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid dates detected');
      Alert.alert('Invalid Date', 'The event dates are not valid.');
      return false;
    }

    if (endDate <= startDate) {
      console.error('End date before start date');
      Alert.alert('Invalid Date', 'The end date must be after the start date.');
      return false;
    }

    // Create the event config
    const eventConfig = {
      title: eventDetails.title,
      startDate: startDate,
      endDate: endDate,
      location: eventDetails.location || '',
      notes: eventDetails.description || '',
      timeZone: 'America/New_York',
      ...(Platform.OS === 'ios' && {
        alarms: [{ relativeOffset: -60 }],
      }),
    };

    console.log('Creating event with config:', eventConfig);

    // Create the event
    const eventId = await Calendar.createEventAsync(calendarId, eventConfig);

    console.log('Event creation result:', eventId);

    if (eventId) {
      console.log('✅ Event created successfully with ID:', eventId);
      return true;
    } else {
      console.error('Event creation returned no ID');
      Alert.alert('Error', 'Failed to create calendar event.');
      return false;
    }
  } catch (error) {
    console.error('Error adding event to calendar:', error);
    Alert.alert('Error', `Failed to add event to calendar: ${error}`);
    return false;
  }
}

/**
 * Check if calendar permissions are granted
 */
export async function hasCalendarPermissions(): Promise<boolean> {
  const { status } = await Calendar.getCalendarPermissionsAsync();
  return status === 'granted';
}