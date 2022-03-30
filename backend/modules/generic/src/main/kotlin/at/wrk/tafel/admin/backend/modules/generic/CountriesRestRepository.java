package at.wrk.tafel.admin.backend.modules.generic;

import at.wrk.tafel.admin.backend.dbmodel.entities.staticdata.CountryEntity;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "countries", collectionResourceRel = "countries")
public interface CountriesRestRepository extends CrudRepository<CountryEntity, Long> {
}