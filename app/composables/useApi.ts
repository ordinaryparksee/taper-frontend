import type { UseFetchOptions, AsyncData, FetchResult } from 'nuxt/app'
import type { NitroFetchRequest, AvailableRouterMethod } from 'nitropack'
import type { FetchError } from 'ofetch'
import type { KeysOf, PickFrom } from '#app/composables/asyncData'

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
