const { google } = require('googleapis');

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
const DEFAULT_TIMEZONE = process.env.GOOGLE_CALENDAR_TIMEZONE || 'Asia/Dhaka';

const formatGoogleDate = (dateInput) => {
  const date = new Date(dateInput);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
};

const buildGoogleCalendarUrl = ({ title, startTime, endTime, details, location }) => {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Appointment',
    dates: `${formatGoogleDate(startTime)}/${formatGoogleDate(endTime)}`,
    details: details || '',
    location: location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const normalizePrivateKey = (privateKey = '') => privateKey.replace(/\\n/g, '\n');

const isCalendarConfigured = () =>
  process.env.GOOGLE_CALENDAR_ENABLED === 'true' &&
  !!process.env.GOOGLE_CALENDAR_ID &&
  !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
  !!process.env.GOOGLE_PRIVATE_KEY;

const getFallbackCalendarLink = ({ appointment, clinic }) =>
  buildGoogleCalendarUrl({
    title: `Vet appointment - ${clinic?.clinicName || 'VetConnect Clinic'}`,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    details: [
      `Pet: ${appointment.petName || 'Not specified'}`,
      `Type: ${appointment.petType || 'Not specified'}`,
      `Reason: ${appointment.reason || 'General checkup'}`,
      `Appointment ID: ${appointment._id || ''}`,
    ].join('\n'),
    location: clinic?.address || '',
  });

const getCalendarClient = async () => {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
    scopes: [CALENDAR_SCOPE],
  });

  await auth.authorize();

  return google.calendar({
    version: 'v3',
    auth,
  });
};

const buildEventPayload = ({ appointment, clinic }) => {
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);

  return {
    summary: `Vet appointment - ${clinic?.clinicName || 'VetConnect Clinic'}`,
    location: clinic?.address || '',
    description: [
      `Pet name: ${appointment.petName || ''}`,
      `Pet type: ${appointment.petType || 'Not specified'}`,
      `Reason: ${appointment.reason || 'General checkup'}`,
      `Notes: ${appointment.notes || 'None'}`,
      `Appointment ID: ${appointment._id || ''}`,
      `Booked via VetConnect`,
    ].join('\n'),
    start: {
      dateTime: start.toISOString(),
      timeZone: DEFAULT_TIMEZONE,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: DEFAULT_TIMEZONE,
    },
    reminders: {
      useDefault: true,
    },
    extendedProperties: {
      private: {
        vetconnectAppointmentId: String(appointment._id || ''),
        vetconnectClinicId: String(appointment.clinic || ''),
        vetconnectPetOwnerId: String(appointment.petOwner || ''),
      },
    },
  };
};

const syncAppointmentToGoogleCalendar = async ({ appointment, clinic }) => {
  const addToCalendarUrl = getFallbackCalendarLink({ appointment, clinic });

  if (!isCalendarConfigured()) {
    return {
      status: 'not_configured',
      message:
        'Google Calendar sync is disabled or missing credentials. Appointment saved in database only.',
      addToCalendarUrl,
      eventId: '',
    };
  }

  try {
    const calendar = await getCalendarClient();
    const requestBody = buildEventPayload({ appointment, clinic });

    const existingEventId = appointment?.calendarSync?.eventId;

    if (existingEventId) {
      const response = await calendar.events.update({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        eventId: existingEventId,
        requestBody,
        sendUpdates: 'none',
      });

      return {
        status: 'synced',
        message: 'Google Calendar event updated successfully',
        addToCalendarUrl: response.data.htmlLink || addToCalendarUrl,
        eventId: response.data.id || existingEventId,
      };
    }

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody,
      sendUpdates: 'none',
    });

    return {
      status: 'synced',
      message: 'Google Calendar event created successfully',
      addToCalendarUrl: response.data.htmlLink || addToCalendarUrl,
      eventId: response.data.id || '',
    };
  } catch (error) {
    return {
      status: 'failed',
      message: `Google Calendar sync failed: ${error.message}`,
      addToCalendarUrl,
      eventId: appointment?.calendarSync?.eventId || '',
    };
  }
};

const removeAppointmentFromGoogleCalendar = async ({ appointment, clinic }) => {
  const addToCalendarUrl = getFallbackCalendarLink({ appointment, clinic });
  const existingEventId = appointment?.calendarSync?.eventId || '';

  if (!isCalendarConfigured()) {
    return {
      status: 'not_configured',
      message:
        'Google Calendar sync is disabled or missing credentials. Appointment cancelled in database only.',
      addToCalendarUrl,
      eventId: existingEventId,
    };
  }

  if (!existingEventId) {
    return {
      status: 'synced',
      message: 'No linked Google Calendar event was found for this appointment.',
      addToCalendarUrl,
      eventId: '',
    };
  }

  try {
    const calendar = await getCalendarClient();

    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId: existingEventId,
      sendUpdates: 'none',
    });

    return {
      status: 'synced',
      message: 'Google Calendar event removed successfully',
      addToCalendarUrl,
      eventId: '',
    };
  } catch (error) {
    if (error?.code === 404 || error?.response?.status === 404) {
      return {
        status: 'synced',
        message: 'Google Calendar event was already missing, treated as removed.',
        addToCalendarUrl,
        eventId: '',
      };
    }

    return {
      status: 'failed',
      message: `Google Calendar delete failed: ${error.message}`,
      addToCalendarUrl,
      eventId: existingEventId,
    };
  }
};

module.exports = {
  syncAppointmentToGoogleCalendar,
  removeAppointmentFromGoogleCalendar,
};
