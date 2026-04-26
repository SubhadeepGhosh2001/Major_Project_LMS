export const hasValidVideoUrl = (
  video: Chapter["video"] | null | undefined
): video is string => typeof video === "string" && video.trim().length > 0;

export const getChapterVideoUrl = (
  chapter?: Chapter | null
): string | undefined => {
  if (!chapter) return undefined;

  if (hasValidVideoUrl(chapter.video)) {
    return chapter.video;
  }

  return undefined;
};

export const normalizeChapter = (
  chapter: Chapter
): Chapter => ({
  ...chapter,
  video: getChapterVideoUrl(chapter),
});

export const normalizeCourse = (course?: Course | null): Course | undefined => {
  if (!course) return undefined;

  return {
    ...course,
    sections: (course.sections || []).map((section) => ({
      ...section,
      chapters: (section.chapters || []).map((chapter) => normalizeChapter(chapter)),
    })),
  };
};

export const flattenCourseChapters = (
  course?: Pick<Course, "sections"> | null
): Array<{ section: Section; chapter: Chapter }> => {
  if (!course?.sections?.length) return [];

  return course.sections.flatMap((section) =>
    (section.chapters || []).map((chapter) => ({ section, chapter }))
  );
};

export const findFirstChapterWithVideo = (
  course?: Pick<Course, "sections"> | null
): { section: Section; chapter: Chapter } | null =>
  flattenCourseChapters(course).find(({ chapter }) =>
    hasValidVideoUrl(chapter.video)
  ) || null;
