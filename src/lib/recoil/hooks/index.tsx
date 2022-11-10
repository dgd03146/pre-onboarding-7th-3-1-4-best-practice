import { api } from "@/lib/api";
import axios, { AxiosError } from "axios";
import { useState } from "react";
import { useRecoilValueLoadable } from "recoil";
import { Sick } from "typings/db";
import { getSickList } from "../selector/sickSelector";

export const useSickList = () => {
  const [data, setData] = useState<Sick[]>();

  const [stateText, setStateText] = useState("");

  const getData = async (keyword: string) => {
    setStateText("로딩중 입니다⏳");
    try {
      const response = await api.get<Sick[]>("/sick", {
        params: { q: keyword }
      });

      setData(response.data);
      setStateText("");
      return response;
    } catch (error) {
      if (error instanceof AxiosError) {
        setStateText("검색 실패😥 다시 시도해주세요.");
        return error;
      }
    } finally {
      setStateText("데이터가 없습니다.");
    }
  };

  return { sickData: data, stateText, getData };
};
