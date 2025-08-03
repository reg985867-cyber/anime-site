import axios from 'axios';

// Базовый URL для AniLiberty API v1
const ANILIBERTY_API_BASE = 'https://aniliberty.top/api';

// Создаем отдельный instance axios для AniLiberty API
const anilibriaV2Api = axios.create({
  baseURL: ANILIBERTY_API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Обработчик ошибок
anilibriaV2Api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('AniLiberty API Error:', error);
    if (error.response?.data?.errors) {
      throw new Error(Object.values(error.response.data.errors).flat().join(', '));
    }
    throw new Error(error.message || 'Ошибка при обращении к AniLiberty API');
  }
);

export const anilibriaV2Service = {
  // Получить популярные аниме согласно требованиям
  async getPopularAnime(params = {}) {
    try {
      const { perPage = 10, page = 1 } = params;
      const response = await anilibriaV2Api.get('/anime/popular', {
        params: { perPage, page }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Ошибка получения популярных аниме: ${error.message}`);
    }
  },

  // Получить новые эпизоды согласно требованиям
  async getNewEpisodes(params = {}) {
    try {
      const { perPage = 10, page = 1 } = params;
      const response = await anilibriaV2Api.get('/releases', {
        params: { perPage, page }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Ошибка получения новых эпизодов: ${error.message}`);
    }
  },

  // Получить новые аниме согласно требованиям
  async getNewAnime(params = {}) {
    try {
      const { perPage = 10, page = 1 } = params;
      const response = await anilibriaV2Api.get('/anime/new', {
        params: { perPage, page }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Ошибка получения новых аниме: ${error.message}`);
    }
  },

  // Получить информацию об аниме по ID
  async getAnimeById(id) {
    try {
      const response = await anilibriaV2Api.get(`/anime/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Ошибка получения аниме ${id}: ${error.message}`);
    }
  },

  // Получить эпизоды аниме по ID
  async getAnimeEpisodes(id) {
    try {
      const response = await anilibriaV2Api.get(`/anime/${id}/episodes`);
      return response.data;
    } catch (error) {
      throw new Error(`Ошибка получения эпизодов аниме ${id}: ${error.message}`);
    }
  },

  // Получить конкретный эпизод по episodeId
  async getEpisodeById(episodeId) {
    try {
      const response = await anilibriaV2Api.get(`/episodes/${episodeId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Ошибка получения эпизода ${episodeId}: ${error.message}`);
    }
  },

  // Поиск аниме по названию
  async searchAnime(query, params = {}) {
    try {
      const { perPage = 20, page = 1, ...filters } = params;
      const response = await anilibriaV2Api.get('/anime/search', {
        params: {
          search: query,
          perPage,
          page,
          ...filters
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Ошибка поиска аниме: ${error.message}`);
    }
  },

  // УСТАРЕВШИЕ МЕТОДЫ ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ
  // Получить последние релизы (для обратной совместимости)
  async getLatestReleases(limit = 50) {
    try {
      return await this.getNewEpisodes({ perPage: limit });
    } catch (error) {
      throw new Error(`Ошибка получения последних релизов: ${error.message}`);
    }
  },

  // Получить случайные релизы (fallback к популярным)
  async getRandomReleases(limit = 10) {
    try {
      return await this.getPopularAnime({ perPage: limit });
    } catch (error) {
      throw new Error(`Ошибка получения случайных релизов: ${error.message}`);
    }
  },

  // Вспомогательные методы для работы с видео

  // Получить URL видео для эпизода в указанном качестве
  getVideoUrl(episode, quality = '720') {
    if (!episode) return null;

    const qualityMap = {
      '1080': episode.hls_1080,
      '720': episode.hls_720,
      '480': episode.hls_480,
    };

    // Возвращаем запрошенное качество или fallback к доступному
    return qualityMap[quality] || 
           episode.hls_1080 || 
           episode.hls_720 || 
           episode.hls_480 || 
           null;
  },

  // Получить все доступные качества для эпизода
  getAvailableQualities(episode) {
    if (!episode) return [];

    const qualities = [];
    if (episode.hls_1080) qualities.push({ height: 1080, src: episode.hls_1080, label: '1080p' });
    if (episode.hls_720) qualities.push({ height: 720, src: episode.hls_720, label: '720p' });
    if (episode.hls_480) qualities.push({ height: 480, src: episode.hls_480, label: '480p' });

    return qualities;
  },

  // Конвертировать данные релиза в формат, совместимый с существующим кодом
  convertReleaseToAnimeFormat(release) {
    if (!release) return null;

    return {
      id: release.id,
      title: release.name?.main || release.name?.english || 'Без названия',
      titleEnglish: release.name?.english,
      titleAlternative: release.name?.alternative,
      alias: release.alias,
      year: release.year,
      type: release.type?.description || release.type?.value,
      status: release.is_ongoing ? 'Онгоинг' : 'Завершён',
      poster: this.getOptimizedImageUrl(release.poster),
      description: release.description,
      episodes: release.episodes_total,
      genres: release.genres?.map(genre => genre.name) || [],
      rating: null, // В AniLiberty API нет рейтинга
      ageRating: release.age_rating?.label,
      season: release.season?.description,
      duration: release.average_duration_of_episode,
      // Дополнительные поля из AniLiberty
      publishDay: release.publish_day?.description,
      isOngoing: release.is_ongoing,
      isInProduction: release.is_in_production,
      favorites: release.added_in_users_favorites,
      fresh_at: release.fresh_at,
      updated_at: release.updated_at,
    };
  },

  // Конвертировать данные эпизода в формат, совместимый с существующим кодом
  convertEpisodeToFormat(episode) {
    if (!episode) return null;

    return {
      id: episode.id,
      number: episode.ordinal,
      title: episode.name || episode.name_english || `Эпизод ${episode.ordinal}`,
      titleEnglish: episode.name_english,
      duration: episode.duration,
      sortOrder: episode.sort_order,
      preview: this.getOptimizedImageUrl(episode.preview),
      
      // Видео URL'ы
      videoUrl: this.getVideoUrl(episode, '720'),
      videoUrls: {
        '480': episode.hls_480,
        '720': episode.hls_720,
        '1080': episode.hls_1080,
      },

      // Тайм-коды для скипа опенинга/эндинга
      opening: episode.opening,
      ending: episode.ending,

      // Внешние плееры
      rutubeId: episode.rutube_id,
      youtubeId: episode.youtube_id,

      updated_at: episode.updated_at,
      releaseId: episode.release_id,
    };
  },

  // Получить оптимизированный URL изображения
  getOptimizedImageUrl(imageObject) {
    if (!imageObject) return null;
    
    // Приоритет: optimized > preview > src > thumbnail
    if (imageObject.optimized?.preview) {
      return `https://aniliberty.top${imageObject.optimized.preview}`;
    }
    if (imageObject.preview) {
      return `https://aniliberty.top${imageObject.preview}`;
    }
    if (imageObject.src) {
      return `https://aniliberty.top${imageObject.src}`;
    }
    if (imageObject.thumbnail) {
      return `https://aniliberty.top${imageObject.thumbnail}`;
    }
    
    return null;
  },

  // Методы для совместимости с существующим кодом приложения

  // Получить аниме по ID (совместимость с animeService)
  async getAnimeById(animeId) {
    try {
      const release = await this.getRelease(animeId);
      return {
        data: this.convertReleaseToAnimeFormat(release),
        success: true
      };
    } catch (error) {
      throw new Error(`Ошибка получения аниме ${animeId}: ${error.message}`);
    }
  },

  // Получить эпизод по ID аниме и номеру эпизода
  async getEpisodeById(animeId, episodeNumber) {
    try {
      // Сначала получаем релиз с эпизодами
      const release = await this.getReleaseWithEpisodes(animeId);
      
      if (!release.episodes || !Array.isArray(release.episodes)) {
        throw new Error('Эпизоды не найдены');
      }

      // Ищем эпизод по номеру
      const episode = release.episodes.find(ep => 
        ep.ordinal === parseFloat(episodeNumber) || 
        ep.sort_order === parseInt(episodeNumber)
      );

      if (!episode) {
        throw new Error(`Эпизод ${episodeNumber} не найден`);
      }

      return {
        data: this.convertEpisodeToFormat(episode),
        success: true
      };
    } catch (error) {
      throw new Error(`Ошибка получения эпизода ${episodeNumber} для аниме ${animeId}: ${error.message}`);
    }
  },

  // Получить видео для аниме и эпизода (совместимость с anicliService)
  async getAnimeVideo(animeId, episodeNumber, quality = '720') {
    try {
      const episodeResponse = await this.getEpisodeById(animeId, episodeNumber);
      const episode = episodeResponse.data;

      if (!episode || !episode.videoUrls) {
        throw new Error('Видео не найдено');
      }

      const videoUrl = episode.videoUrls[quality] || 
                      episode.videoUrls['720'] || 
                      episode.videoUrls['1080'] || 
                      episode.videoUrls['480'];

      if (!videoUrl) {
        throw new Error('Видео URL не найден');
      }

      return {
        url: videoUrl,
        qualities: this.getAvailableQualities({
          hls_480: episode.videoUrls['480'],
          hls_720: episode.videoUrls['720'],
          hls_1080: episode.videoUrls['1080'],
        }),
        type: 'hls', // Всегда HLS для AniLiberty
        episode: episode,
        success: true
      };
    } catch (error) {
      throw new Error(`Ошибка получения видео: ${error.message}`);
    }
  },
};

export default anilibriaV2Service;