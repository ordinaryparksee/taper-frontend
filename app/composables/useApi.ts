import type { UseFetchOptions, AsyncData, FetchResult } from 'nuxt/app'
import type { NitroFetchRequest, AvailableRouterMethod } from 'nitropack'
import type { FetchError } from 'ofetch'
import type { KeysOf, PickFrom } from '#app/composables/asyncData'
import type { BaseResponse } from '~~/shared/types/response'

/* eslint-disable @typescript-eslint/no-invalid-void-type */
export function useApi<
  ResT = void,
  ErrorT = FetchError,
  ReqT extends NitroFetchRequest = NitroFetchRequest,
  Method extends AvailableRouterMethod<ReqT> = ResT extends void ? ('get' extends AvailableRouterMethod<ReqT> ? 'get' : AvailableRouterMethod<ReqT>) : AvailableRouterMethod<ReqT>,
  _ResT = ResT extends void ? FetchResult<ReqT, Method> : ResT,
  DataT = _ResT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
  DefaultT = DataT
>(
  url: ReqT | (() => ReqT),
  options?: UseFetchOptions<_ResT, DataT, PickKeys, DefaultT, ReqT, Method>
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, ErrorT | undefined> {
  return useFetch(url, {
    ...options,
    $fetch: useNuxtApp().$api as typeof $fetch
  })
}
/* eslint-enable @typescript-eslint/no-invalid-void-type */

/* eslint-disable @typescript-eslint/no-explicit-any */
export function useApiData<
  T,
  ErrorT = FetchError,
  ReqT extends NitroFetchRequest = NitroFetchRequest,
  Method extends AvailableRouterMethod<ReqT> = 'get' extends AvailableRouterMethod<ReqT> ? 'get' : AvailableRouterMethod<ReqT>,
  _ResT = BaseResponse<T>,
  DataT = _ResT,
  DefaultT = DataT
>(
  url: ReqT | (() => ReqT),
  options?: UseFetchOptions<_ResT, DataT, any, DefaultT, ReqT, Method>
) {
  const { data: response, ...rest } = useApi<_ResT, ErrorT, ReqT, Method, _ResT, DataT, any, DefaultT>(url, options)

  const data = computed(() => (response.value as BaseResponse<T> | null)?.data)

  return {
    ...rest,
    response,
    data
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
