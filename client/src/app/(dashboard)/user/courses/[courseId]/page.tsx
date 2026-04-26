"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Loading from "@/components/Loading";
import { useGetCourseQuery } from "@/state/api";
import { findFirstChapterWithVideo, normalizeCourse } from "@/lib/course-utils";

const CourseEntryPage = () => {
  const router = useRouter();
  const { courseId } = useParams();

  const { data: rawCourse, isLoading } = useGetCourseQuery(
    (courseId as string) ?? "",
    {
      skip: !courseId,
    }
  );
  const course = normalizeCourse(rawCourse);

  useEffect(() => {
    if (!courseId || !course) return;

    const firstPlayableChapter = findFirstChapterWithVideo(course);

    if (firstPlayableChapter) {
      router.replace(
        `/user/courses/${courseId}/chapters/${firstPlayableChapter.chapter.chapterId}`,
        {
          scroll: false,
        }
      );
    }
  }, [course, courseId, router]);

  if (isLoading) return <Loading />;

  const firstPlayableChapter = findFirstChapterWithVideo(course);

  if (!firstPlayableChapter) {
    return <div>No playable video chapters available for this course.</div>;
  }

  return <Loading />;
};

export default CourseEntryPage;
