import axios from 'axios';

// Базовый URL для AniLiberty API v1
const ANILIBERTY_API_BASE = 'https://aniliberty.top/api/v1';

// Создаем отдельный instance axios для AniLiberty API
const anilibriaV2Api = axios.create({
  baseURL: ANILIBERTY_API_BASE,
  timeout: 10000,
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
  // Получить последние релизы
  async getLatestReleases(limit = 50) {
    try {
      const response = await anilibriaV2Api.get('/anime/releases/latest', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Ошибка получения последних релизов: ${error.message}`);
    }
  },

  // Получить релиз по ID или alias
  async getRelease(idOrAlias, include = '') {
    try {
      const params = {};
      if (include) params.include = include;

      const response = await anilibriaV2Api.get(`/anime/releases/${idOrAlias}`, {
        params
      });
      return response.data;
    } catch (error) {
      throw new Error(`Ошибка получения релиза ${idOrAlias}: ${error.message}`);
    }
  },

  // Получить релиз с эпизодами
  async getReleaseWithEpisodes(idOrAlias) {
    try {
      // Включаем эпизоды в ответ
      const response = await anilibriaV2Api.get(`/anime/releases/${idOrAlias}`, {
        params: {
          include: 'episodes'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Ошибка получения релиза с эпизодами ${idOrAlias}: ${error.message}`);
    }
  },

  // Получить конкретный эпизод
  async getEpisode(episodeId, include = '') {
    try {
      const params = {};
      if (include) params.include = include;

      const response = await anilibriaV2Api.get(`/anime/releases/episodes/${episodeId}`, {
        params
      });
      return response.data;
    } catch (error) {
      throw new Error(`Ошибка получения эпизода ${episodeId}: ${error.message}`);
    }
  },

  // Получить эпизод с данными релиза
  async getEpisodeWithRelease(episodeId) {
    try {
      const response = await anilibriaV2Api.get(`/anime/releases/episodes/${episodeId}`, {
        params: {
          include: 'release'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Ошибка получения эпизода с релизом ${episodeId}: ${error.message}`);
    }
  },

  // Поиск релизов
  async searchReleases(query, page = 1, limit = 50) {
    try {
      const response = await anilibriaV2Api.get('/app/search/releases', {
        params: {
          search: query,
          page,
          limit
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Ошибка поиска релизов: ${error.message}`);
    }
  },

  // Получить рекомендуемые релизы
  async getRecommendedReleases(limit = 20) {
    try {
      const response = await anilibriaV2Api.get('/anime/releases/recommended', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Ошибка получения рекомендуемых релизов: ${error.message}`);
    }
  },

  // Получить случайные релизы
  async getRandomReleases(limit = 10) {
    try {
      const response = await anilibriaV2Api.get('/anime/releases/random', {
        params: { limit }
      });
      return response.data;
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