const express = require('express');
const router = express.Router();
const anilibertyService = require('../services/anilibertyService');
const { authenticate, optionalAuth } = require('../middleware/auth');

/**
 * Получение популярных аниме
 * GET /api/anime/popular
 */
router.get('/anime/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await anilibertyService.getPopularAnime(limit);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Ошибка получения популярных аниме'
      });
    }
  } catch (error) {
    console.error('Error in popular anime route:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: 'Ошибка получения популярных аниме'
    });
  }
});

/**
 * Получение новых эпизодов
 * GET /api/anime/new-episodes
 */
router.get('/anime/new-episodes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15;
    const result = await anilibertyService.getNewEpisodes(limit);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Ошибка получения новых эпизодов'
      });
    }
  } catch (error) {
    console.error('Error in new episodes route:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: 'Ошибка получения новых эпизодов'
    });
  }
});

/**
 * Получение деталей аниме
 * GET /api/anime/:id
 */
router.get('/anime/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Валидация ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный ID аниме',
        message: 'ID аниме должен быть числом'
      });
    }
    
    const result = await anilibertyService.getAnimeDetails(parseInt(id));
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error,
        message: 'Аниме не найдено'
      });
    }
  } catch (error) {
    console.error('Error in anime details route:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: 'Ошибка получения деталей аниме'
    });
  }
});

/**
 * Получение данных эпизода
 * GET /api/episode/:id
 */
router.get('/episode/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Валидация ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный ID эпизода',
        message: 'ID эпизода должен быть числом'
      });
    }
    
    const result = await anilibertyService.getEpisodeData(parseInt(id));
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error,
        message: 'Эпизод не найден'
      });
    }
  } catch (error) {
    console.error('Error in episode data route:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: 'Ошибка получения данных эпизода'
    });
  }
});

/**
 * Поиск аниме
 * GET /api/anime/search
 */
router.get('/anime/search', async (req, res) => {
  try {
    const { query, limit } = req.query;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Поисковый запрос не может быть пустым',
        message: 'Введите название аниме для поиска'
      });
    }
    
    const result = await anilibertyService.searchAnime(query.trim(), parseInt(limit) || 20);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Ошибка поиска аниме'
      });
    }
  } catch (error) {
    console.error('Error in search route:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: 'Ошибка поиска аниме'
    });
  }
});

/**
 * Получение каталога аниме с фильтрацией
 * GET /api/anime/catalog
 */
router.get('/anime/catalog', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      genres,
      year,
      season,
      status,
      type,
      orderBy = 'updated_at',
      sort = 'desc'
    } = req.query;
    
    const params = {
      page: parseInt(page),
      perPage: parseInt(limit),
      orderBy,
      sort
    };
    
    if (genres) params.genres = genres;
    if (year) params.year = year;
    if (season) params.season = season;
    if (status) params.status = status;
    if (type) params.type = type;
    
    const result = await anilibertyService.getCatalog(params);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Ошибка получения каталога'
      });
    }
  } catch (error) {
    console.error('Error in catalog route:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: 'Ошибка получения каталога'
    });
  }
});

/**
 * Получение жанров
 * GET /api/anime/genres
 */
router.get('/anime/genres', async (req, res) => {
  try {
    const result = await anilibertyService.getGenres();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Ошибка получения жанров'
      });
    }
  } catch (error) {
    console.error('Error in genres route:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: 'Ошибка получения жанров'
    });
  }
});

/**
 * Получение расписания релизов
 * GET /api/anime/schedule
 */
router.get('/anime/schedule', async (req, res) => {
  try {
    const result = await anilibertyService.getSchedule();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Ошибка получения расписания'
      });
    }
  } catch (error) {
    console.error('Error in schedule route:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: 'Ошибка получения расписания'
    });
  }
});

/**
 * Проверка статуса API
 * GET /api/status
 */
router.get('/status', async (req, res) => {
  try {
    const result = await anilibertyService.checkStatus();
    
    res.json({
      success: true,
      aniliberty: result.success ? result.data : { status: 'error', error: result.error },
      server: {
        status: 'running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    console.error('Error in status route:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: 'Ошибка проверки статуса'
    });
  }
});

module.exports = router;