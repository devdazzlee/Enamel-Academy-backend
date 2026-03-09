"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { coursesService } from '@/lib/api/courses';
import { authApi } from '@/lib/api/http';
import { API_PATHS } from '@/lib/api/endpoints';
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Clock,
  Award,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

type ApiTopic = {
  id?: string | number;
  title: string;
  duration?: string;
};

type ApiLesson = {
  id: string | number;
  title: string;
  description?: string;
  duration?: string;
  videoUrl?: string;
  topics: ApiTopic[];
};

function toStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function extractLessons(raw: unknown): ApiLesson[] {
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;
  const data = (obj.data && typeof obj.data === 'object' ? obj.data : obj) as Record<string, unknown>;
  const curriculum = Array.isArray(data.curriculum) ? data.curriculum : [];
  return curriculum.map((section: unknown, idx: number): ApiLesson => {
    const s = (section && typeof section === 'object' ? section : {}) as Record<string, unknown>;
    const topics: ApiTopic[] = Array.isArray(s.topics)
      ? s.topics.map((t: unknown) => {
          const tp = (t && typeof t === 'object' ? t : {}) as Record<string, unknown>;
          return {
            id: tp.id as string | number | undefined,
            title: toStr(tp.title, `Topic ${idx + 1}`),
            duration: toStr(tp.duration),
          };
        })
      : [];
    return {
      id: (s.id as string | number | undefined) ?? idx + 1,
      title: toStr(s.title, `Lesson ${idx + 1}`),
      description: toStr(s.description),
      duration: toStr(s.duration),
      videoUrl: toStr(s.video_url ?? s.videoUrl ?? s.video),
      topics,
    };
  });
}

export default function CoursePlay() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId') ?? '';

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentLessonIdx, setCurrentLessonIdx] = useState(0);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string | number>>(new Set());

  const [courseTitle, setCourseTitle] = useState('');
  const [lessons, setLessons] = useState<ApiLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Fetch course data and build lessons from API curriculum
  useEffect(() => {
    if (!courseId) {
      setLoadError('No course ID provided.');
      setLoading(false);
      return;
    }
    let alive = true;
    const run = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const response = await authApi.get(API_PATHS.courses.details, { params: { id: courseId } });
        if (!alive) return;
        const data = response.data as Record<string, unknown>;
        const courseData = (data?.data && typeof data.data === 'object' ? data.data : data) as Record<string, unknown>;
        const courseObj = (courseData?.course && typeof courseData.course === 'object' ? courseData.course : courseData) as Record<string, unknown>;
        setCourseTitle(toStr(courseObj?.title ?? courseObj?.name ?? courseData?.title));
        const extracted = extractLessons(data);
        setLessons(extracted);
      } catch {
        if (!alive) return;
        setLoadError('Unable to load course content. Please try again.');
      } finally {
        if (alive) setLoading(false);
      }
    };
    void run();
    return () => { alive = false; };
  }, [courseId]);

  const currentLesson = lessons[currentLessonIdx];

  // Video time tracking — fire-and-forget every 30 seconds
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentLesson) return;
    let lastTracked = 0;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
      if (courseId && video.duration > 0 && video.currentTime - lastTracked >= 30) {
        lastTracked = video.currentTime;
        const videoPct = Math.round((video.currentTime / video.duration) * 100);
        coursesService.trackProgress(courseId, {
          lesson_id: typeof currentLesson.id === 'number' ? currentLesson.id : Number(currentLesson.id) || undefined,
          step_index: currentLessonIdx,
          watched_seconds: Math.round(video.currentTime),
          progress_percentage: videoPct,
          completed: false,
        }).catch(() => {/* ignore */});
      }
    };
    const updateDuration = () => setDuration(video.duration);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [currentLessonIdx, courseId, currentLesson]);

  const markLessonComplete = useCallback(() => {
    if (!currentLesson || completedLessonIds.has(currentLesson.id)) return;
    setCompletedLessonIds((prev) => new Set([...prev, currentLesson.id]));
    if (courseId) {
      const lessonId = currentLesson.id;
      const progressPct = Math.round(((completedLessonIds.size + 1) / lessons.length) * 100);
      // POST /courses/{id}/progress
      coursesService.trackProgress(courseId, {
        lesson_id: typeof lessonId === 'number' ? lessonId : Number(lessonId) || undefined,
        step_index: currentLessonIdx,
        watched_seconds: Math.round(duration),
        progress_percentage: progressPct,
        completed: true,
      }).catch(() => {/* ignore */});
      // POST /courses/{id}/lessons/{id}/complete
      coursesService.markLessonComplete(courseId, lessonId).catch(() => {/* ignore */});
      // POST /courses/{id}/topics/{id}/complete — for each topic in this lesson
      currentLesson.topics.forEach((topic) => {
        if (topic.id) {
          coursesService.markTopicComplete(courseId, topic.id).catch(() => {/* ignore */});
        }
      });
    }
  }, [courseId, currentLesson, currentLessonIdx, completedLessonIds, lessons.length, duration]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) { video.pause(); } else { void video.play(); }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleLessonChange = (idx: number) => {
    setCurrentLessonIdx(idx);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const courseProgress = lessons.length > 0 ? (completedLessonIds.size / lessons.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <Spinner />
          <p className="text-sm">Loading course content...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-red-600">{loadError}</p>
          <button onClick={() => router.back()} className="text-sm text-gray-600 underline">Go back</button>
        </div>
      </div>
    );
  }

  if (lessons.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-600">No lessons available for this course.</p>
          <button onClick={() => router.back()} className="text-sm text-gray-600 underline">Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push(`/course/${courseId}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowLeft size={16} />
              <span>Back to Course</span>
            </button>
            <h1 className="text-xl font-semibold text-gray-900 truncate max-w-md">
              {courseTitle || 'Course Player'}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Award size={16} />
              <span>{completedLessonIds.size}/{lessons.length} completed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Video Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <div className="bg-black rounded-lg overflow-hidden">
              <div className="relative aspect-video">
                {currentLesson.videoUrl ? (
                  <video
                    key={currentLesson.videoUrl}
                    ref={videoRef}
                    src={currentLesson.videoUrl}
                    className="w-full h-full"
                    onEnded={markLessonComplete}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    No video available for this lesson.
                  </div>
                )}

                {/* Video Controls Overlay */}
                {currentLesson.videoUrl && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="mb-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress}
                        onChange={handleSeek}
                        className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-white mt-1">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button onClick={togglePlay} className="text-white hover:text-gray-300 transition">
                          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                        </button>
                        <button onClick={toggleMute} className="text-white hover:text-gray-300 transition">
                          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                      </div>
                      <button className="text-white hover:text-gray-300 transition">
                        <Maximize size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lesson Info */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 pr-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentLesson.title}</h2>
                  {currentLesson.description && (
                    <p className="text-gray-600">{currentLesson.description}</p>
                  )}
                </div>
                {currentLesson.duration && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 flex-shrink-0">
                    <Clock size={16} />
                    <span>{currentLesson.duration}</span>
                  </div>
                )}
              </div>

              {/* Topics list */}
              {currentLesson.topics.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Topics</p>
                  <ul className="space-y-1">
                    {currentLesson.topics.map((topic, i) => (
                      <li key={topic.id ?? i} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                        {topic.title}
                        {topic.duration && <span className="text-xs text-gray-400">({topic.duration})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleLessonChange(currentLessonIdx - 1)}
                  disabled={currentLessonIdx === 0}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={20} />
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {completedLessonIds.has(currentLesson.id) ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle size={20} />
                      <span className="text-sm font-medium">Completed</span>
                    </div>
                  ) : (
                    <button
                      onClick={markLessonComplete}
                      className="px-4 py-2 text-sm font-medium text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-50 transition"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleLessonChange(currentLessonIdx + 1)}
                  disabled={currentLessonIdx === lessons.length - 1}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Course Progress */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Progress</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Overall Progress</span>
                  <span className="font-medium text-gray-900">{Math.round(courseProgress)}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-purple-700 rounded-full transition-all duration-300"
                    style={{ width: `${courseProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  {completedLessonIds.size} of {lessons.length} lessons completed
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 sticky top-6">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Content</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <BookOpen size={16} />
                    <span>{lessons.length} lessons</span>
                  </div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {lessons.map((lesson, index) => {
                  const isCompleted = completedLessonIds.has(lesson.id);
                  const isCurrent = index === currentLessonIdx;
                  return (
                    <div
                      key={String(lesson.id)}
                      className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                        isCurrent ? 'bg-purple-50 border-l-4 border-l-purple-600' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleLessonChange(index)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {isCompleted ? (
                            <CheckCircle size={20} className="text-green-600" />
                          ) : isCurrent ? (
                            <div className="w-5 h-5 rounded-full border-2 border-purple-600 bg-purple-600 flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium text-sm ${isCurrent ? 'text-purple-900' : 'text-gray-900'}`}>
                            {lesson.title}
                          </h4>
                          {lesson.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{lesson.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {lesson.duration && (
                              <span className="text-xs text-gray-400">{lesson.duration}</span>
                            )}
                            {isCurrent && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">
                                Current
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Course Completion */}
              {courseProgress === 100 && (
                <div className="p-6 bg-green-50 border-t border-green-200">
                  <div className="flex items-center gap-3 text-green-800">
                    <Award size={24} />
                    <div>
                      <h4 className="font-semibold">Course Completed!</h4>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/cpd-certificate')}
                    className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                  >
                    View Certificate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
