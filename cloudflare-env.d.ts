interface CloudflareEnv {
  ASSETS?: Fetcher;
  NEXT_INC_CACHE_R2_BUCKET?: R2Bucket;
  DRKARD_UPLOADS?: R2Bucket;
  DRKARD_QBANKS?: R2Bucket;
  DRKARD_DB?: D1Database;
  DRKARD_LIMITS?: KVNamespace;
  IMAGES?: ImagesBinding;
}
