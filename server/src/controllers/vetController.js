const VetClinic = require('../models/VetClinic');
const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_CLINIC_IMAGE = '/clinic-default.svg';

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseLocationPayload = (body) => {
  const latitude = parseNumber(body.latitude);
  const longitude = parseNumber(body.longitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    type: 'Point',
    coordinates: [longitude, latitude],
  };
};

const convertClinicPayload = (body) => {
  const location = parseLocationPayload(body);
  const workingDays = Array.isArray(body.workingDays)
    ? body.workingDays.filter((day) => WEEK_DAYS.includes(day))
    : [];

  return {
    clinicName: body.clinicName,
    address: body.address,
    contactNumber: body.contactNumber,
    servicesOffered: Array.isArray(body.servicesOffered)
      ? body.servicesOffered
      : String(body.servicesOffered || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
    workingHours: {
      openTime: body.openTime,
      closeTime: body.closeTime,
    },
    workingDays: workingDays.length ? workingDays : WEEK_DAYS.slice(1, 6),
    appointmentsEnabled: body.appointmentsEnabled !== false && body.appointmentsEnabled !== 'false',
    consultationFee: Number(body.consultationFee),
    clinicImage: body.clinicImage || DEFAULT_CLINIC_IMAGE,
    ...(location ? { location } : {}),
  };
};

const timeToMinutes = (value = '') => {
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const addDerivedFields = (clinic) => {
  const plainClinic = typeof clinic.toObject === 'function' ? clinic.toObject() : { ...clinic };
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentDay = WEEK_DAYS[now.getDay()];
  const openMinutes = timeToMinutes(plainClinic?.workingHours?.openTime);
  const closeMinutes = timeToMinutes(plainClinic?.workingHours?.closeTime);
  const worksToday =
    Array.isArray(plainClinic?.workingDays) && plainClinic.workingDays.length
      ? plainClinic.workingDays.includes(currentDay)
      : true;

  let isOpenNow = false;
  if (
    plainClinic?.appointmentsEnabled !== false &&
    worksToday &&
    openMinutes !== null &&
    closeMinutes !== null
  ) {
    isOpenNow = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }

  return {
    ...plainClinic,
    latitude: plainClinic?.location?.coordinates?.[1] ?? null,
    longitude: plainClinic?.location?.coordinates?.[0] ?? null,
    workingDays:
      Array.isArray(plainClinic?.workingDays) && plainClinic.workingDays.length
        ? plainClinic.workingDays
        : WEEK_DAYS.slice(1, 6),
    appointmentsEnabled: plainClinic?.appointmentsEnabled !== false,
    isOpenNow,
  };
};

const getAllVetClinics = async (req, res) => {
  try {
    const { search, service, minRating, lat, lng, radiusKm, ownerId } = req.query;

    const ratingFilter = parseNumber(minRating);
    const latitude = parseNumber(lat);
    const longitude = parseNumber(lng);
    const radiusMeters = parseNumber(radiusKm) ? Number(radiusKm) * 1000 : null;

    const matchStage = {};

    if (ratingFilter !== null) {
      matchStage.rating = { $gte: ratingFilter };
    }

    if (ownerId) {
      matchStage.owner = ownerId;
    }

    if (latitude !== null && longitude !== null) {
      matchStage.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          ...(radiusMeters ? { $maxDistance: radiusMeters } : {}),
        },
      };
    }

    const clinics = await VetClinic.find(matchStage)
      .populate('owner', 'name email role')
      .sort(latitude !== null && longitude !== null ? {} : { createdAt: -1 });

    const normalizedSearch = String(search || '').trim().toLowerCase();
    const normalizedService = String(service || '').trim().toLowerCase();

    const enrichedClinics = clinics.map((clinic) => {
      const enriched = addDerivedFields(clinic);
      const distanceKm =
        latitude !== null && longitude !== null && enriched.latitude !== null && enriched.longitude !== null
          ? Number(
              (
                Math.sqrt(
                  (enriched.latitude - latitude) ** 2 + (enriched.longitude - longitude) ** 2
                ) * 111
              ).toFixed(2)
            )
          : null;

      return {
        ...enriched,
        distanceKm,
      };
    }).filter((clinic) => {
      const matchesSearch =
        !normalizedSearch ||
        String(clinic.clinicName || '').toLowerCase().includes(normalizedSearch) ||
        String(clinic.address || '').toLowerCase().includes(normalizedSearch) ||
        (clinic.servicesOffered || []).some((item) =>
          String(item || '').toLowerCase().includes(normalizedSearch)
        );

      const matchesService =
        !normalizedService ||
        (clinic.servicesOffered || []).some((item) =>
          String(item || '').toLowerCase().includes(normalizedService)
        );

      return matchesSearch && matchesService;
    });

    res.status(200).json({
      success: true,
      count: enrichedClinics.length,
      data: enrichedClinics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vet clinics',
      error: error.message,
    });
  }
};

const getVetClinicById = async (req, res) => {
  try {
    const clinic = await VetClinic.findById(req.params.id).populate('owner', 'name email role');

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Vet clinic not found',
      });
    }

    res.status(200).json({
      success: true,
      data: addDerivedFields(clinic),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vet clinic',
      error: error.message,
    });
  }
};

const createVetClinic = async (req, res) => {
  try {
    const clinicPayload = convertClinicPayload(req.body);

    const clinic = await VetClinic.create({
      ...clinicPayload,
      owner: req.user._id,
    });

    const populatedClinic = await VetClinic.findById(clinic._id).populate('owner', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Vet clinic created successfully',
      data: addDerivedFields(populatedClinic),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create vet clinic',
      error: error.message,
    });
  }
};

const updateVetClinic = async (req, res) => {
  try {
    const clinic = await VetClinic.findByIdAndUpdate(
      req.params.id,
      convertClinicPayload(req.body),
      {
        new: true,
        runValidators: true,
      }
    ).populate('owner', 'name email role');

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Vet clinic not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vet clinic updated successfully',
      data: addDerivedFields(clinic),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update vet clinic',
      error: error.message,
    });
  }
};

const deleteVetClinic = async (req, res) => {
  try {
    const clinic = await VetClinic.findByIdAndDelete(req.params.id);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Vet clinic not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vet clinic deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete vet clinic',
      error: error.message,
    });
  }
};

module.exports = {
  getAllVetClinics,
  getVetClinicById,
  createVetClinic,
  updateVetClinic,
  deleteVetClinic,
};
